// Comprehensive NSFW content filter
// This module detects and blocks inappropriate search terms

// Normalize text to catch evasion attempts
function normalizeText(text: string): string {
  return text
    // Convert to lowercase
    .toLowerCase()
    // Remove spaces between characters (catches "p o r n")
    .replace(/\s+/g, '')
    // Remove common substitution characters
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b')
    .replace(/[9]/g, 'g')
    .replace(/\$/g, 's')
    .replace(/\+/g, 't')
    // Remove special characters and punctuation
    .replace(/[^a-z]/g, '');
}

// List of blocked terms - explicit content
const explicitTerms = [
  'porn', 'porno', 'pornography', 'pornographic',
  'nude', 'nudes', 'nudity', 'naked',
  'xxx', 'xxxx', 'xxxxx',
  'sex', 'sexual', 'sexually', 'sexscene',
  'nsfw',
  'hentai',
  'erotic', 'erotica',
  'adult', 'adultcontent', 'adultvideo',
  'explicit',
  'hardcore',
  'softcore',
  'stripper', 'stripping', 'striptease',
  'orgasm',
  'masturbat',
  'fetish',
  'bdsm',
  'bondage',
  'kink', 'kinky',
  'slutty', 'slut',
  'whore',
  'prostitut',
  'escort',
  'camgirl', 'camboy', 'webcam',
  'onlyfans',
  'playboy', 'playgirl',
  'penthouse',
  'brazzers',
  'pornhub',
  'xvideos', 'xnxx', 'xhamster',
  'redtube',
  'youporn',
  'spankwire',
  'bangbros',
  'realitykings',
  'mofos',
  'tushy',
  'blacked',
  'vixen',
  'digitalplayground',
  'naughtyamerica',
  'fakehub',
  'teamskeet',
  'mylf',
  'sislovesme',
  'familystrokes',
  'pervertfamily',
];

// Movies/shows known for explicit content
const explicitMoviesShows = [
  'fiftyshadesofgrey', 'fiftyshadesdarker', 'fiftyshades', '50shades', '50shadesofgrey',
  'blueisthewarmestcolor',
  'nymphomaniac',
  'showgirls',
  'basicinstinct',
  'nineandalfweeks', '9halfweeks',
  'bodyheat',
  'wildthings',
  'striptease',
  'booknights', 'bookienoights',
  'caligula',
  'emmanuelle',
  'shame2011',
  'thebettypage',
  'secretdiary', 'secretdiaryofacallgirl',
  'spartacus', // the explicit version searches
  'gameofthronesn', // searches specifically for nude scenes
  'euphoria', // when combined with explicit terms
];

// Body parts in explicit context
const explicitBodyParts = [
  'breast', 'breasts', 'boob', 'boobs', 'tit', 'tits', 'titty', 'titties',
  'ass', 'asses', 'butt', 'butts', 'booty',
  'penis', 'dick', 'cock', 'cocks',
  'vagina', 'pussy', 'pussies',
  'genitals', 'genital',
  'nipple', 'nipples',
  'areola',
  'anus', 'anal',
  'testicle', 'testicles', 'balls',
  'clitoris', 'clit',
];

// Sexual acts
const sexualActs = [
  'blowjob', 'bj',
  'handjob', 'hj',
  'footjob',
  'titjob',
  'creampie',
  'cumshot',
  'facial',
  'gangbang',
  'threesome', '3some',
  'foursome', '4some',
  'orgy',
  'doggystyle',
  'missionary',
  'cowgirl',
  'reversecowgirl',
  'deepthroat',
  'rimjob', 'rimming',
  'fingering',
  'fisting',
  'squirt', 'squirting',
  'ejaculat',
  'penetrat',
  'intercourse',
  'copulat',
];

// Contextual modifiers that make searches explicit
const explicitModifiers = [
  'scene', 'scenes',
  'clip', 'clips',
  'video', 'videos',
  'uncensored',
  'uncut',
  'unrated',
  'full',
  'hot',
  'sexy',
  'steamy',
  'intimate',
  'compilation',
  'leaked',
  'private',
];

// Check if text contains any blocked term
function containsBlockedTerm(normalizedText: string, terms: string[]): boolean {
  return terms.some(term => normalizedText.includes(term));
}

// Main filter function
export function isContentBlocked(searchText: string): { blocked: boolean; reason?: string } {
  if (!searchText || searchText.trim().length === 0) {
    return { blocked: false };
  }

  const normalized = normalizeText(searchText);
  const originalLower = searchText.toLowerCase();

  // Check explicit terms
  if (containsBlockedTerm(normalized, explicitTerms)) {
    return { blocked: true, reason: 'Explicit content is not allowed' };
  }

  // Check explicit movies/shows
  if (containsBlockedTerm(normalized, explicitMoviesShows)) {
    return { blocked: true, reason: 'This content is not available' };
  }

  // Check body parts in isolation or with modifiers
  for (const bodyPart of explicitBodyParts) {
    if (normalized.includes(bodyPart)) {
      // Check if combined with explicit modifiers
      for (const modifier of explicitModifiers) {
        if (normalized.includes(modifier)) {
          return { blocked: true, reason: 'Inappropriate search terms detected' };
        }
      }
      // Body part alone might be blocked
      if (normalized === bodyPart || normalized.startsWith(bodyPart) || normalized.endsWith(bodyPart)) {
        return { blocked: true, reason: 'This search is not allowed' };
      }
    }
  }

  // Check sexual acts
  if (containsBlockedTerm(normalized, sexualActs)) {
    return { blocked: true, reason: 'Explicit content is not allowed' };
  }

  // Check for patterns like "movie name + nude/naked/sex"
  const hasExplicitModifier = explicitModifiers.some(mod => normalized.includes(mod));
  const hasExplicitContext = ['nude', 'naked', 'sex', 'hot', 'sexy', 'steamy'].some(term => normalized.includes(term));
  if (hasExplicitModifier && hasExplicitContext) {
    return { blocked: true, reason: 'Inappropriate search combination detected' };
  }

  // Check for repeated characters trying to bypass (like "nnnuuudddeee")
  const deduped = normalized.replace(/(.)\1+/g, '$1');
  if (deduped !== normalized) {
    // Re-check with deduplicated text
    if (containsBlockedTerm(deduped, [...explicitTerms, ...explicitBodyParts, ...sexualActs])) {
      return { blocked: true, reason: 'Filter bypass attempt detected' };
    }
  }

  return { blocked: false };
}

// Check if user is attempting to bypass filters
export function isEvasionAttempt(searchText: string): boolean {
  const normalized = normalizeText(searchText);
  const original = searchText.toLowerCase();

  // Check for excessive spaces between characters
  const spaceRatio = (original.match(/\s/g) || []).length / original.replace(/\s/g, '').length;
  if (spaceRatio > 0.5 && original.replace(/\s/g, '').length > 3) {
    // High space ratio might indicate "p o r n" style evasion
    const blocked = isContentBlocked(searchText);
    if (blocked.blocked) {
      return true;
    }
  }

  // Check for leetspeak patterns
  const hasLeetspeak = /[0-9@$!|+]/.test(original);
  if (hasLeetspeak) {
    const blocked = isContentBlocked(searchText);
    if (blocked.blocked) {
      return true;
    }
  }

  return false;
}

// Validate search and take action
export function validateSearch(searchText: string): { 
  valid: boolean; 
  shouldClose: boolean; 
  message?: string 
} {
  const blockResult = isContentBlocked(searchText);
  
  if (blockResult.blocked) {
    const isEvasion = isEvasionAttempt(searchText);
    
    if (isEvasion) {
      // User is trying to bypass - close the page
      return {
        valid: false,
        shouldClose: true,
        message: 'Filter bypass attempt detected. Session terminated.',
      };
    }
    
    return {
      valid: false,
      shouldClose: false,
      message: blockResult.reason || 'This search is not allowed',
    };
  }

  return { valid: true, shouldClose: false };
}
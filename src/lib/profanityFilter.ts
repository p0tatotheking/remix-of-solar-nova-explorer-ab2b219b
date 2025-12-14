// Basic profanity filter with common offensive words
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'cock', 'pussy', 
  'bastard', 'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard', 'cunt',
  'asshole', 'motherfucker', 'bullshit', 'piss', 'douche'
];

// Create regex patterns for each word (case insensitive, word boundaries)
const profanityPatterns = PROFANITY_LIST.map(word => 
  new RegExp(`\\b${word}\\b`, 'gi')
);

// Also catch variations with numbers substituted for letters
const leetSpeakMap: Record<string, string> = {
  '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't'
};

function normalizeLeetSpeak(text: string): string {
  let normalized = text.toLowerCase();
  for (const [leet, letter] of Object.entries(leetSpeakMap)) {
    normalized = normalized.replace(new RegExp(`\\${leet}`, 'g'), letter);
  }
  return normalized;
}

export function containsProfanity(text: string): boolean {
  const normalizedText = normalizeLeetSpeak(text);
  return PROFANITY_LIST.some(word => normalizedText.includes(word));
}

export function censorText(text: string): string {
  let censored = text;
  
  // First pass: direct matches
  for (const pattern of profanityPatterns) {
    censored = censored.replace(pattern, (match) => '*'.repeat(match.length));
  }
  
  // Second pass: check normalized version for leet speak
  const words = censored.split(/\s+/);
  const censoredWords = words.map(word => {
    const normalized = normalizeLeetSpeak(word);
    for (const profanity of PROFANITY_LIST) {
      if (normalized.includes(profanity)) {
        return '*'.repeat(word.length);
      }
    }
    return word;
  });
  
  return censoredWords.join(' ');
}

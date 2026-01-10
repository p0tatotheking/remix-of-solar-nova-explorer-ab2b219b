// List of blocked movie/show IDs that contain explicit/NSFW content
// These IDs are blocked from being accessed in the TV & Movies section

// TMDB Movie IDs known for explicit content
export const blockedMovieIds = new Set([
  // Fifty Shades series
  '216015', '337167', '337168',
  // Blue is the Warmest Color
  '152584',
  // Nymphomaniac
  '137853', '230195',
  // Showgirls
  '9354',
  // Basic Instinct
  '538',
  // 9 1/2 Weeks
  '12102',
  // Body Heat
  '11831',
  // Wild Things
  '11975',
  // Striptease
  '9884',
  // Boogie Nights
  '4995',
  // Caligula
  '29212',
  // Emmanuelle series
  '27782', '25952', '26131', '27021',
  // Shame
  '73501',
  // Eyes Wide Shut
  '345',
  // Secretary
  '10375',
  // The Dreamers
  '804',
  // Y Tu Mama Tambien
  '1621',
  // Romance
  '20720',
  // Ken Park
  '16374',
  // Shortbus
  '14254',
  // Antichrist
  '18279',
  // The Brown Bunny
  '15356',
  // 365 Days series
  '664413', '822387', '1029280',
  // Sex, Lies, and Videotape
  '11235',
  // In the Realm of the Senses
  '14587',
  // Last Tango in Paris
  '15163',
  // Deep Throat
  '10989',
  // Belle de Jour
  '5955',
  // The Pillow Book
  '3589',
  // Don't Look Now
  '12704',
  // The Handmaiden
  '274136',
  // Raw
  '393578',
  // Pleasure
  '582014',
  // Climax
  '459258',
  // Love (2015)
  '291549',
]);

// TMDB TV Show IDs with explicit content
export const blockedTVIds = new Set([
  // Sex/Life
  '126865',
  // Spartacus (unrated)
  '46648',
  // The Tudors
  '14497',
  // Secret Diary of a Call Girl
  '10023',
  // Masters of Sex
  '46533',
  // Californication
  '4099',
  // Girls
  '42360',
  // Sense8
  '61664',
  // True Blood
  '10545',
  // Big Little Lies (explicit scenes)
  '68066',
  // Westworld (explicit content)
  '63247',
]);

// Keywords/patterns in URL paths that indicate explicit content
export const blockedUrlPatterns = [
  /\/adult\//i,
  /\/xxx\//i,
  /\/porn/i,
  /\/nude/i,
  /\/nsfw/i,
  /\/explicit/i,
  /\/erotic/i,
  /\/hentai/i,
  /sex-scene/i,
  /nude-scene/i,
];

// Check if a URL contains blocked content
export function isBlockedContent(url: string): { blocked: boolean; reason?: string } {
  try {
    const urlLower = url.toLowerCase();
    
    // Check for blocked patterns in URL
    for (const pattern of blockedUrlPatterns) {
      if (pattern.test(urlLower)) {
        return { blocked: true, reason: 'This content is not available' };
      }
    }
    
    // Extract movie/TV ID from common URL patterns
    // Pattern: /movie/{id} or /tv/{id} or /watch/{type}/{id}
    const movieMatch = urlLower.match(/\/movie\/(\d+)/);
    const tvMatch = urlLower.match(/\/tv\/(\d+)/);
    const watchMovieMatch = urlLower.match(/\/watch\/movie\/(\d+)/);
    const watchTvMatch = urlLower.match(/\/watch\/tv\/(\d+)/);
    const genericIdMatch = urlLower.match(/[?&]id=(\d+)/);
    const embedMatch = urlLower.match(/\/embed\/(\d+)/);
    const playerMatch = urlLower.match(/\/player\/(\d+)/);
    
    // Check all possible ID extractions
    const potentialIds = [
      movieMatch?.[1],
      tvMatch?.[1],
      watchMovieMatch?.[1],
      watchTvMatch?.[1],
      genericIdMatch?.[1],
      embedMatch?.[1],
      playerMatch?.[1],
    ].filter(Boolean) as string[];
    
    for (const id of potentialIds) {
      if (blockedMovieIds.has(id) || blockedTVIds.has(id)) {
        return { blocked: true, reason: 'This content is restricted' };
      }
    }
    
    // Check for any numeric ID in the last path segment
    const pathSegments = urlLower.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment && /^\d+$/.test(lastSegment.split('?')[0])) {
      const id = lastSegment.split('?')[0];
      if (blockedMovieIds.has(id) || blockedTVIds.has(id)) {
        return { blocked: true, reason: 'This content is restricted' };
      }
    }
    
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}

// Add more IDs dynamically (for admin purposes)
export function addBlockedMovieId(id: string) {
  blockedMovieIds.add(id);
}

export function addBlockedTVId(id: string) {
  blockedTVIds.add(id);
}

export function isDefined<T>(value: T | undefined): value is T {
  return typeof value !== 'undefined';
}

export function deduplicateLanguages(languages: string[]) {
  const seen = new Set();
  return languages.filter(lang => {
    const baseLang = lang.substring(0, 2).toLowerCase();
    if (seen.has(baseLang)) {
      return false;
    }
    seen.add(baseLang);
    return true;
  });
}


export function isJwtExpired(token: string) {
    // Decode the payload
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Get the current time in seconds
    const currentTime = Date.now() / 1000;

    // Check if the token is expired
    return payload.exp < currentTime;
}


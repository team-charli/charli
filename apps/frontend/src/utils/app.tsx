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

export const formatDateTimeLocal = (date: Date): string => {
    const ten = (i: number): string => (i < 10 ? '0' : '') + i;
    const YYYY: string = date.getFullYear().toString();
    const MM: string = ten(date.getMonth() + 1); // Months are 0-indexed in JavaScript Date objects
    const DD: string = ten(date.getDate());
    const HH: string = ten(date.getHours());
    const mm: string = ten(date.getMinutes());

    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
  };


export function checkIfNotificationExpired(dateStr: string): boolean {
  const now = new Date();
  const targetDate = new Date(dateStr);
  return targetDate < now; // Returns true if the targetDate is in the past compared to now
}


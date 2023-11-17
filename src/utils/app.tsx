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


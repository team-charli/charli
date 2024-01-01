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

export function getStorage(key: string) {
  const item = localStorage.getItem(key);
  if (item && item.length) {
    return JSON.parse(item)
  } else {
    return undefined;
  }
}

export function loadCurrentAccount() {
  return getStorage('currentAccount')
}

export function loadSessionSigs() {
  return getStorage('sessionSigs')
}

export function loadAccountAndSessionKeys() {
  const currentAccount = loadCurrentAccount();
  const sessionSigs = loadSessionSigs();
  return {currentAccount, sessionSigs}
}


// atoms.ts
import { atom } from 'jotai';

export const renderLoginButtonsAtom = atom<boolean>(false);

export const selectedLangAtom = atom<string>('');

export const nativeLangAtom = atom<string>('');

export const signInInitiatedAtom = atom(false);


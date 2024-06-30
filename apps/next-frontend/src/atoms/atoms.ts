// atoms.ts
import { atom } from 'jotai';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';

export const renderLoginButtonsAtom = atom<boolean>(false);

export const selectedLangAtom = atom<string>('');

export const nativeLangAtom = atom<string>('');


export const authMethodAtom = atom<AuthMethod | null | undefined>(null);
export const litAccountAtom = atom<IRelayPKP | null | undefined>(null);
export const sessionSigsAtom = atom<SessionSigs | null | undefined>(null);
export const litNodeClientReadyAtom = atom<boolean>(false);
export const isLoadingAtom = atom<boolean>(true);
export const isOAuthRedirectAtom = atom<boolean>(false);

// These were already defined in the previous version
export const isOnboardedAtom = atom(false);
export const isLitLoggedInAtom = atom(false);
export const onboardModeAtom = atom<'Teach' | 'Learn' | null>(null);

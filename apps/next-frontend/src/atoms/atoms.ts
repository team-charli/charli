// atoms.ts
import { atom } from 'jotai';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { atomWithStorage } from 'jotai/utils';
import { sessionSigsExpired } from '@/utils/app';

export const renderLoginButtonsAtom = atom<boolean>(false);
export const selectedLangAtom = atom<string>('');
export const nativeLangAtom = atom<string>('');

export const authMethodAtom = atomWithStorage<AuthMethod | null | undefined>('authMethod', null);
export const litAccountAtom = atomWithStorage<IRelayPKP | null | undefined>('litAccount', null);
export const onboardModeAtom = atomWithStorage<'Teach' | 'Learn' | null>('onboardMode', null);

export const userIdAtom = atom<string | null>(null);

export const userNameAtom = atom<string>('')




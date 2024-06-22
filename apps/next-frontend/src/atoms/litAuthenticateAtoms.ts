import { atom } from 'recoil';
import { AuthMethod } from '@lit-protocol/types';

export const signInInitiatedAtom = atom<boolean>({
  key: 'signInInitiatedAtom',
  default: false,
});

export const authMethodAtom = atom<AuthMethod | null>({
  key: 'authMethod',
  default: null,
});

export const authLoadingAtom = atom<boolean>({
  key: 'authLoading',
  default: false,
});

export const authErrorAtom = atom<Error | undefined>({
  key: 'authError',
  default: undefined,
});

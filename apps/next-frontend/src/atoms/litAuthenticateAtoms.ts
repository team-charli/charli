import { atom } from 'recoil';
import { AuthMethod } from '@lit-protocol/types';

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

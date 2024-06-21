import { atom } from 'recoil';
import { SessionSigs } from '@lit-protocol/types';

export const sessionSigsAtom = atom<SessionSigs | null>({
  key: 'sessionSigs',
  default: null,
});

export const sessionSigsLoadingAtom = atom<boolean>({
  key: 'sessionSigsLoading',
  default: false,
});

export const sessionSigsErrorAtom = atom<Error | undefined>({
  key: 'sessionSigsError',
  default: undefined,
});


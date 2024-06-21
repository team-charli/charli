import { atom } from 'recoil';
import { IRelayPKP } from '@lit-protocol/types';

export const currentAccountAtom = atom<IRelayPKP | null>({
  key: 'currentAccount',
  default: null,
});

export const accountsLoadingAtom = atom<boolean>({
  key: 'accountsLoading',
  default: false,
});

export const accountsErrorAtom = atom<Error | undefined>({
  key: 'accountsError',
  default: undefined,
});

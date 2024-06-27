import { atomWithQuery } from 'jotai-tanstack-query';
import { IRelayPKP, AuthMethod } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';
import { authenticateAtom } from './litAuthMethodAtomQuery';

export const fetchLitAccountsAtom = atomWithQuery((get) => ({
  queryKey: ['fetchLitAccounts'],
  queryFn: async (): Promise<IRelayPKP | null> => {
    const authMethod = get(authenticateAtom).data;
    if (!authMethod) return null;
    const myPKPs = await getPKPs(authMethod);
    return myPKPs.length ? myPKPs[0] : await mintPKP(authMethod);
  },
  enabled: !!get(authenticateAtom).data,
}));

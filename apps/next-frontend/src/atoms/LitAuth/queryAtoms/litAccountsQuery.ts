import { atomWithQuery } from 'jotai-tanstack-query';
import { IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';
import { LitAccountCallbacks } from '@/types/types';
import { litAccountStateAtom } from '../litAccountStateAtom';
import { litAuthMethodStateAtom } from '../litAuthMethodStateAtom';

const callbacks: LitAccountCallbacks = {
  onSuccess: (data, { set }) => {
    set(litAccountStateAtom, (prev) => ({ ...prev, data, error: undefined }));
  },
  onError: (error, { set }) => {
    set(litAccountStateAtom, (prev) => ({ ...prev, data: null, error }));
  },
  onSettled: (data, error, { set }) => {
    set(litAccountStateAtom, (prev) => ({ ...prev, isLoading: false }));
  },
};

export const fetchLitAccountsAtom = atomWithQuery((get) => ({
  queryKey: ['fetchLitAccounts', get(litAuthMethodStateAtom.state)],
  queryFn: async (): Promise<IRelayPKP | null> => {
    const authMethod = get(litAuthMethodStateAtom.value);
    if (!authMethod) throw new Error('No auth method available');
    try {
      const myPKPs = await getPKPs(authMethod);
      if (myPKPs.length) {
        return myPKPs[0];
      } else {
        return await mintPKP(authMethod);
      }
    } catch (error) {
      console.error("Error fetching LitAccounts:", error);
      throw error;
    }
  },
  ...callbacks,
  enabled: !!get(litAuthMethodStateAtom.value),
}));

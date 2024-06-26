import { atomWithQuery } from 'jotai-tanstack-query';
import { SessionSigs, AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { QueryAtoms, SessionSigsCallbacks } from '@/types/types';
import { createQueryAtom } from '@/utils/queryAtomUtils';
import { getProviderByAuthMethod } from '@/utils/lit';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';
import { litNodeClient } from '@/utils/litClients';

// Import the atoms we need
import { litAuthMethodStateAtom } from '@/atoms/LitAuth/litAuthMethodStateAtom';
import { litAccountStateAtom } from '@/atoms/LitAuth/litAccountStateAtom';

// Create the session sigs atoms
export const litSessionSigsAtoms: QueryAtoms<SessionSigs> = createQueryAtom<SessionSigs>({
  data: null,
  error: undefined,
  isLoading: false,
});

// Define the callbacks
const callbacks: SessionSigsCallbacks = {
  onSuccess: (data, { set }) => {
    set(litSessionSigsAtoms, (prev) => ({ ...prev, data, error: undefined, isLoading: false }));
  },
  onError: (error, { set }) => {
    set(litSessionSigsAtoms, (prev) => ({ ...prev, data: null, error, isLoading: false }));
  },
  onSettled: (data, error, { set }) => {
    set(litSessionSigsAtoms, (prev) => ({ ...prev, isLoading: false }));
  },
};

// Create the query atom
export const litSessionAtom = atomWithQuery((get) => ({
  queryKey: ['litSession', get(litAuthMethodStateAtom.state), get(litAccountStateAtom.state)],
  queryFn: async (): Promise<SessionSigs | null> => {
    const authMethod = get(litAuthMethodStateAtom.value);
    const currentAccount = get(litAccountStateAtom.value);
    const existingSessionSigs = get(litSessionSigsAtoms.value);

    if (!authMethod || !currentAccount) {
      throw new Error('Auth method or current account not available');
    }

    if (existingSessionSigs && !sessionSigsExpired(existingSessionSigs)) {
      return existingSessionSigs;
    }

    if (!litNodeClient.ready) {
      await litNodeClient.connect();
    }

    const provider = getProviderByAuthMethod(authMethod);
    if (!provider) {
      throw new Error('No provider object');
    }

    const resourceAbilityRequests = [
      {
        resource: new LitPKPResource('*'),
        ability: LitAbility.PKPSigning,
      },
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.LitActionExecution,
      },
    ];

    try {
      const sessionSigs: SessionSigs = await litNodeClient.getPkpSessionSigs({
        pkpPublicKey: currentAccount.publicKey,
        authMethods: [authMethod],
        resourceAbilityRequests: resourceAbilityRequests
      });

      if (!sessionSigs) {
        throw new Error("Problem getting session sigs");
      }

      return sessionSigs;
    } catch (error) {
      console.error("Error in litNodeClient.getPkpSessionSigs:", error);
      throw error;
    }
  },
  ...callbacks,
}));

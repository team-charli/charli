import { atomWithQuery } from 'jotai-tanstack-query';
import { SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod } from '@/utils/lit';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { litNodeClient } from '@/utils/litClients';
import { authenticateAtom } from './litAuthMethodAtomQuery';
import { fetchLitAccountsAtom } from './litAccountsAtomQuery';

export const litSessionAtom = atomWithQuery((get) => ({
  queryKey: ['litSession'],
  queryFn: async (): Promise<SessionSigs | null> => {
    const authMethod = get(authenticateAtom).data;
    const currentAccount = get(fetchLitAccountsAtom).data;
    if (!authMethod || !currentAccount) return null;

    if (!litNodeClient.ready) {
      await litNodeClient.connect();
    }

    const provider = getProviderByAuthMethod(authMethod);
    if (!provider) return null;

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

    return await litNodeClient.getPkpSessionSigs({
      pkpPublicKey: currentAccount.publicKey,
      authMethods: [authMethod],
      resourceAbilityRequests: resourceAbilityRequests
    });
  },
  enabled: !!get(authenticateAtom).data && !!get(fetchLitAccountsAtom).data,
}));

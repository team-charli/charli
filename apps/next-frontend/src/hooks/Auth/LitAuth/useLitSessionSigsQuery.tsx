import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';
import { log } from 'console';
import React from 'react';

interface SessionSigsQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [AuthMethod | null | undefined, IRelayPKP | null | undefined];
  invalidateQueries: () => Promise<string>;
}

export const useLitSessionSigsQuery = ({queryKey, enabledDeps, queryFnData, invalidateQueries}: SessionSigsQueryParams) => {
  const queryClient = useQueryClient();
  const [authMethod, litAccount] = queryFnData;

  return useQuery<SessionSigs | null, Error>({
    queryKey,
    queryFn: async (): Promise<SessionSigs | null> => {
      try {
        console.log('SessionSigs queryFn called', {
          authMethod: !!authMethod,
          litAccount: !!litAccount,
          litNodeClientReady: litNodeClient.ready
        });
        if (!litNodeClient.ready) {
          throw new Error('LitNodeClient not connected');
        }
        if (!authMethod) {
          throw new Error('Missing authMethod');
        }
        if (!litAccount) {
          throw new Error('Missing litAccount');
        }
      const cachedSessionSigs = queryClient.getQueryData(queryKey) as SessionSigs | null;
      if (cachedSessionSigs && !sessionSigsExpired(cachedSessionSigs)) {
        console.log('Using valid cached sessionSigs');
        return cachedSessionSigs;
      }
      console.log('Fetching new sessionSigs');
      const newSessionSigs = await litNodeClient.getPkpSessionSigs({
        pkpPublicKey: litAccount.publicKey,
        authMethods: [authMethod],
        resourceAbilityRequests: [
          {
            resource: new LitPKPResource('*'),
            ability: LitAbility.PKPSigning,
          },
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.LitActionExecution,
          },
        ]
  });
        console.log('New sessionSigs obtained');
        return newSessionSigs;
      } catch (error) {
        console.error('Failed to fetch new sessionSigs', error);
        invalidateQueries();
        return null;
      }
    },
    enabled: enabledDeps && typeof window !== 'undefined',
    staleTime: 0,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
};

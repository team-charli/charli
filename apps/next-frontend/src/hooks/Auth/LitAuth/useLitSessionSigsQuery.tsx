import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';
import { useAuthChainManager } from '../useAuthChainManager';

interface SessionSigsQueryParams {
  queryKey: [string, boolean],
  enabledDeps: boolean,
  queryFnData: [AuthMethod | null | undefined, IRelayPKP | null | undefined],
}

export const useLitSessionSigsQuery = ({queryKey, enabledDeps, queryFnData}: SessionSigsQueryParams) => {
  const queryClient = useQueryClient();
  const [authMethod, litAccount] = queryFnData;
  const { checkAndInvalidate } = useAuthChainManager();

  return useQuery<SessionSigs | null>({
    queryKey,
    queryFn: async (): Promise<SessionSigs | null> => {
      if (!authMethod || !litAccount) throw new Error('missing authMethod or litAccount');

      const cachedSessionSigs = queryClient.getQueryData(queryKey) as SessionSigs | null;
      if (cachedSessionSigs && sessionSigsExpired(cachedSessionSigs)) {
        console.log('Cached sessionSigs expired, invalidating auth chain');
        await checkAndInvalidate();
        // After invalidation, we still want to try to get new sessionSigs
      }

      console.log('Fetching new sessionSigs');
      const sessionSigs = await litNodeClient.getPkpSessionSigs({
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

      if (sessionSigs) {
        console.log('New sessionSigs obtained');
        return sessionSigs;
      }

      console.log('Failed to obtain new sessionSigs, invalidating auth chain');
      await checkAndInvalidate();
      return null;
    },
    initialData: () => {
      const cachedSessionSigs = queryClient.getQueryData(queryKey) as SessionSigs | null;
      if (cachedSessionSigs && !sessionSigsExpired(cachedSessionSigs)) {
        console.log('Using valid cached sessionSigs');
        return cachedSessionSigs;
      }
      return null;
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

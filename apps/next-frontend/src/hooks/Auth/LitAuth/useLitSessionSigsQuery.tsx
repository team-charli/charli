//useLitSessionSigsQuery.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';

interface SessionSigsQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [AuthMethod | null | undefined, IRelayPKP | null | undefined, boolean];
  invalidateQueries: () => Promise<string>;
}

export const useLitSessionSigsQuery = ({queryKey, enabledDeps, queryFnData, invalidateQueries}: SessionSigsQueryParams) => {
  const queryClient = useQueryClient();
  const [authMethod, litAccount, isConnected] = queryFnData;

  return useQuery<SessionSigs | null, Error>({
    queryKey,
    queryFn: async (): Promise<SessionSigs | null> => {
      try {
        console.log("4a: start sessionSigs query")
        if (!isConnected) {
          console.log("4b: finish sessionSigs query")
          throw new Error('LitNodeClient not connected');
        }
        if (!authMethod) {
          console.log("4b: finish sessionSigs query")
          throw new Error('Missing authMethod');
        }
        if (!litAccount) {
          console.log("4b: finish sessionSigs query")
          throw new Error('Missing litAccount');
        }
        const cachedSessionSigs = queryClient.getQueryData(queryKey) as SessionSigs | null;
        if (cachedSessionSigs && !sessionSigsExpired(cachedSessionSigs)) {
          console.log('Using valid cached sessionSigs');
          console.log("4b: finish sessionSigs query")

          return cachedSessionSigs;
        } else if (cachedSessionSigs && sessionSigsExpired(cachedSessionSigs)){
          console.log("4b: finish sessionSigs query -- expired sessionSigs invalidating authchain")
          invalidateQueries();
          return null;
        }

        console.log('Fetching new sessionSigs');
        await litNodeClient.getLatestBlockhash();
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
        console.log("4b: finish sessionSigs query")

        return newSessionSigs;
      } catch (error) {
        console.error('Failed to fetch new sessionSigs', error);
        invalidateQueries();
        return null;
      }
    },
    enabled: enabledDeps && typeof window !== 'undefined',
    staleTime:  5 * 60 * 1000, // 5 minutes,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
};

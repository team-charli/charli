import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';
import { authChainLogger } from '@/App';

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
        authChainLogger.info("4a: start sessionSigs query")
        if (!isConnected) {
          authChainLogger.info("4b: finish sessionSigs query")
          throw new Error('LitNodeClient not connected');
        }
        if (!authMethod) {
          authChainLogger.info("4b: finish sessionSigs query")
          throw new Error('Missing authMethod');
        }
        if (!litAccount) {
          authChainLogger.info("4b: finish sessionSigs query")
          throw new Error('Missing litAccount');
        }
        const cachedSessionSigs = queryClient.getQueryData(queryKey) as SessionSigs | null;
        if (cachedSessionSigs && !sessionSigsExpired(cachedSessionSigs)) {
          authChainLogger.info('Using valid cached sessionSigs');
          authChainLogger.info("4b: finish sessionSigs query")

          return cachedSessionSigs;
        } else if (cachedSessionSigs && sessionSigsExpired(cachedSessionSigs)){
          authChainLogger.info("4b: finish sessionSigs query -- expired sessionSigs invalidating authchain")
          invalidateQueries();
          return null;
        }

        authChainLogger.info('Fetching new sessionSigs');
        await litNodeClient.getLatestBlockhash();
        authChainLogger.info({litAccount, authMethod});

        //POST https://15.235.83.220:7472/web/sign_session_key/v1 500 (Internal Server Error) is the authenticate method calling the contracts (because contracts are stateful, nodes are not) -- if so may need to implement a version of https://github.com/LIT-Protocol/lit-login-server/blob/main/README.md

        authChainLogger.info("public key", litAccount.tokenId)

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
        authChainLogger.info('New sessionSigs obtained');
        authChainLogger.info("4b: finish sessionSigs query")

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

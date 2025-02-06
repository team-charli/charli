//useLitSessionSigsQuery.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { validateSessionSigs } from '@lit-protocol/misc';
import { SessionSigs, AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { authChainLogger } from '@/App';
import { AuthMethodPlus } from '@/types/types';

interface SessionSigsQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [AuthMethodPlus | null | undefined, IRelayPKP | null | undefined, boolean];
  invalidateQueries: () => Promise<string>;
  persister: any;
  additionalResourceAbilityRequests?: Array<{ resource: any, ability: any }>;
}

export const useLitSessionSigsQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  invalidateQueries,
  persister,
  additionalResourceAbilityRequests = [],
}: SessionSigsQueryParams) => {
  const queryClient = useQueryClient();

  // Extract input data
  let authMethod: AuthMethod | undefined;
  let litAccount: IRelayPKP | undefined;
  let isConnected = false;

  if (queryFnData[0]) {
    const accessToken = queryFnData[0].idToken;
    const authMethodType = queryFnData[0].authMethodType;
    authMethod = { accessToken, authMethodType };
  }
  if (queryFnData[1]) {
    litAccount = queryFnData[1];
  }
  if (typeof queryFnData[2] === 'boolean') {
    isConnected = queryFnData[2];
  }

  return useQuery<SessionSigs | null, Error>({
    queryKey,
    enabled: enabledDeps && typeof window !== 'undefined',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    persister,

    queryFn: async (): Promise<SessionSigs | null> => {
      try {
        authChainLogger.info('4a: start sessionSigs query');

        // Basic checks
        if (!isConnected) {
          throw new Error('LitNodeClient not connected');
        }
        if (!authMethod) {
          throw new Error('Missing authMethod');
        }
        if (!litAccount) {
          throw new Error('Missing litAccount');
        }

        // 1) See if we have cached session sigs
        const cachedSessionSigs = queryClient.getQueryData<SessionSigs>(queryKey);

        // 2) Validate if present
        if (cachedSessionSigs) {
          const { isValid, errors } = validateSessionSigs(cachedSessionSigs);

          if (isValid) {
            authChainLogger.info('Using valid cached sessionSigs');
            return cachedSessionSigs;
          } else {
            authChainLogger.info('Cached sessionSigs invalid/expired; errors:', errors);
            // Invalidate entire chain
            await invalidateQueries();
            return null;
          }
        }

        // 3) If no cache, fetch new session sigs
        authChainLogger.info('Fetching new sessionSigs');
        await litNodeClient.getLatestBlockhash();
        authChainLogger.info('litAccount:', litAccount);
        authChainLogger.info('authMethod:', authMethod);

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
            ...additionalResourceAbilityRequests,
          ],
        });

        authChainLogger.info('New sessionSigs obtained');
        return newSessionSigs;
      } catch (error) {
        console.error('Failed to fetch new sessionSigs', error);
        // Invalidate queries if something is wrong
        await invalidateQueries();
        return null;
      }
    },
  });
};

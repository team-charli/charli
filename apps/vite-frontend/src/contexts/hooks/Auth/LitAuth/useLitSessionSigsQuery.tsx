//useLitSessionSigsQuery.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { validateSessionSigs } from '@lit-protocol/misc';
import { SessionSigs, AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { authChainLogger } from '@/App';
import { UnifiedAuth } from '@/types/types';
import { toLitAuthMethod } from '@/utils/lit';
import { router } from '@/TanstackRouter/router';

interface SessionSigsQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [
  UnifiedAuth | null | undefined,   // e.g. from your useAuthChain
  IRelayPKP  | null | undefined,
  boolean
];
  persister: any;
  additionalResourceAbilityRequests?: Array<{ resource: any; ability: any }>;
}

export const useLitSessionSigsQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  persister,
  additionalResourceAbilityRequests = [],
}: SessionSigsQueryParams) => {
  const queryClient = useQueryClient();

  // Extract input data
  let unifiedAuth: UnifiedAuth | undefined;
  let litAccount: IRelayPKP | undefined;
  let isConnected = false;

  // 1) Grab the first array item as your `UnifiedAuth`
  if (queryFnData[0]) {
    unifiedAuth = queryFnData[0];
  }
  // 2) The second array item is the PKP
  if (queryFnData[1]) {
    litAccount = queryFnData[1];
  }
  // 3) The third boolean is the "isConnected" flag
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
        if (!unifiedAuth) {
          throw new Error('Missing unifiedAuth data');
        }
        if (!litAccount) {
          throw new Error('Missing litAccount');
        }

        // 4) Convert your "unifiedAuth" to a Lit `AuthMethod` for usage
        const litAuthMethod: AuthMethod = toLitAuthMethod(unifiedAuth);

        // 1) See if we have cached session sigs
        const cachedSessionSigs = queryClient.getQueryData<SessionSigs>(queryKey);
        if (cachedSessionSigs) {
          const { isValid, errors } = validateSessionSigs(cachedSessionSigs);
          if (isValid) {
            authChainLogger.info('Using valid cached sessionSigs');
            return cachedSessionSigs;
          } else {
            authChainLogger.info('Cached sessionSigs invalid/expired; errors:', errors);
            // Invalidate entire chain
            console.log("Cached sessionSigs contain expired tokens");
            console.log('will redirect to login');

            // Clear local storage
            localStorage.clear();

            // Clear entire Tanstack Query cache
            queryClient.clear();

            // Redirect to login
            router.navigate({ to: '/login' });

            // Throw an error to prevent further execution
            throw new Error('SesisonSigs expired, cache cleared and redirected');
          }
        }

        // 3) If no cache, fetch new session sigs
        authChainLogger.info('Fetching new sessionSigs');
        await litNodeClient.getLatestBlockhash();
        authChainLogger.info('litAccount:', litAccount);
        authChainLogger.info('authMethod:', litAuthMethod);

        const newSessionSigs = await litNodeClient.getPkpSessionSigs({
          pkpPublicKey: litAccount.publicKey,
          authMethods: [litAuthMethod], // <-- pass the real AuthMethod
          resourceAbilityRequests: [
            { resource: new LitPKPResource('*'), ability: LitAbility.PKPSigning },
            { resource: new LitActionResource('*'), ability: LitAbility.LitActionExecution },
            ...additionalResourceAbilityRequests,
          ],
        });

        authChainLogger.info('New sessionSigs obtained');
        return newSessionSigs;
      } catch (error) {
        console.error('useLitSessionSigsQuery failed', error);
        // Invalidate queries if something is wrong

        // Clear local storage
        localStorage.clear();

        // Clear entire Tanstack Query cache
        queryClient.clear();

        // Redirect to login
        router.navigate({ to: '/login' });

        // Throw an error to prevent further execution
        throw new Error('useLitSessionSigsQuery failed: see logged error');
      }
    },
  });
};

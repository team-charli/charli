import { useQuery } from '@tanstack/react-query';
import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, usePkpWallet, useNonce, useSignature, useSupabaseJWT, useSupabaseClient, useIsOnboarded, useHasBalance } from './index'
import { useInitQueriesAtoms } from './utils/initQueriesAtoms';
import { useAuthChainManager } from './useAuthChainManager';

export const useInitQueries = () => {
  const {jwt, authMethod, litAccount, sessionSigs, litNodeClientReady} = useInitQueriesAtoms()
  const { checkAndInvalidate } = useAuthChainManager();

  const queries = {
    litNodeClientQuery: useLitNodeClientReadyQuery(),
    authMethodQuery: useLitAuthMethodQuery(),
    litAccountQuery: useLitAccountQuery(),
    sessionSigsQuery: useLitSessionSigsQuery(),
    pkpWalletQuery: usePkpWallet(),
    nonceQuery: useNonce(),
    signatureQuery: useSignature(),
    supabaseJWTQuery: useSupabaseJWT(),
    supabaseClientQuery: useSupabaseClient(),
    isOnboardedQuery: useIsOnboarded(),
    hasBalance: useHasBalance()
  };

  useQuery({
    queryKey: ['initQueriesCheck'],
    queryFn: async () => {
      await checkAndInvalidate();
      return null;
    },
    refetchInterval: 60000, // Check every minute
  });

  const loadingQueries = Object.entries(queries)
    .filter(([_, query]) => query.isLoading)
    .map(([name, _]) => name);

  const failedQueries = Object.entries(queries)
    .filter(([_, query]) => query.isError)
    .map(([name, _]) => name);

  const isLoading = loadingQueries.length > 0;
  const isSuccess = failedQueries.length === 0 && !isLoading;

  return {
    ...queries,
    isLoading,
    isSuccess,
    loadingQueries,
    failedQueries
  };
};

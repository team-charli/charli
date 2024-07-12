import { useQuery } from '@tanstack/react-query';
import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, usePkpWallet, useNonce, useSignature, useSupabaseJWT, useSupabaseClient } from './index'
import { useInitQueriesAtoms } from './utils/initQueriesAtoms';
import { useAuthChainManager } from './useAuthChainManager';

export const useInitQueries = () => {
  const {jwt, authMethod, litAccount, sessionSigs, litNodeClientReady} = useInitQueriesAtoms()
  const litNodeClientQuery = useLitNodeClientReadyQuery();
  const authMethodQuery = useLitAuthMethodQuery();
  const litAccountQuery = useLitAccountQuery();
  const sessionSigsQuery = useLitSessionSigsQuery();
  const pkpWalletQuery = usePkpWallet();
  const nonceQuery = useNonce();
  const signatureQuery = useSignature();
  const supabaseJWTQuery = useSupabaseJWT();
  const supabaseClientQuery = useSupabaseClient();
  const { checkAndInvalidate} = useAuthChainManager();

  useQuery({
    queryKey: ['initQueriesCheck'],
    queryFn: async () => {
      await checkAndInvalidate();
      return null;
    },
    refetchInterval: 60000, // Check every minute
  });

  const queries = {
    litNodeClientQuery,
    authMethodQuery,
    litAccountQuery,
    sessionSigsQuery,
    pkpWalletQuery,
    nonceQuery,
    signatureQuery,
    supabaseJWTQuery,
    supabaseClientQuery
  };

  const isLoading = Object.values(queries).some(query => query.isLoading);
  const isSuccess = Object.values(queries).every(query => query.isSuccess);

  return {
    ...queries,
    isLoading,
    isSuccess
  };
};

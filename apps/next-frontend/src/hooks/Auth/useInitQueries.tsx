import { useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, usePkpWallet, useNonce, useSignature, useSupabaseJWT, useSupabaseClient, useIsOnboarded, useHasBalance } from '@/hooks/Auth/'
import { useLitNodeClientReadyQuery } from './LitAuth/useLitNodeClientReadyQuery';
import { useSetAtom } from 'jotai';
import { isLoadingAtom } from '@/atoms/atoms';
import { useEffect } from 'react';
import { useLitSessionSigsExpirationCheck } from './LitAuth/useLitSessionSigsExpirationCheck';

export const useInitQueries = () => {
  const sessionSigsExpired = useLitSessionSigsExpirationCheck();
  const litNodeClientQuery = useLitNodeClientReadyQuery();
  const authMethodQuery = useLitAuthMethodQuery();
  const litAccountQuery = useLitAccountQuery();
  const sessionSigsQuery = useLitSessionSigsQuery();
  const pkpWalletQuery = usePkpWallet();
  const nonceQuery = useNonce();
  const signatureQuery = useSignature();
  const supabaseJWTQuery = useSupabaseJWT();
  const supabaseClientQuery = useSupabaseClient();
  const isOnboardedQuery = useIsOnboarded();
  const hasBalanceQuery = useHasBalance();
  const setIsLoading = useSetAtom(isLoadingAtom);

  const queries = {
    litNodeClientQuery,
    authMethodQuery,
    litAccountQuery,
    sessionSigsQuery,
    pkpWalletQuery,
    nonceQuery,
    signatureQuery,
    supabaseJWTQuery,
    supabaseClientQuery,
    isOnboardedQuery,
    hasBalanceQuery
  };

  const isLoading = Object.values(queries).some(query => query.isLoading);
  const isSuccess = hasBalanceQuery.isSuccess;

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  // useEffect(() => {
  //   if (!isSuccess) {
  //     const failedQueries = Object.entries(queries)
  //       .filter(([_, query]) => !query.isSuccess)
  //       .map(([name, _]) => name);
  //     console.log('Failed queries:', failedQueries.join(', '));
  //   }
  // }, [isSuccess]);

  return {
    ...queries,
    isLoading,
    isSuccess
  };
};

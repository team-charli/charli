import { useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, usePkpWallet, useNonce, useSignature, useSupabaseJWT, useSupabaseClient, useIsOnboarded, useHasBalance } from '@/hooks/Auth/'
import { useLitNodeClientReadyQuery } from './LitAuth/useLitNodeClientReadyQuery';
import { useSetAtom } from 'jotai';
import { isLoadingAtom } from '@/atoms/atoms';
import { useEffect } from 'react';
import { useJwtExpirationCheck } from './SupabaseClient/useJWTExpirationCheck';
import { useLitSessionSigsExpirationCheck } from './LitAuth/useLitSessionSigsExpirationCheck';

export const useInitQueries = () => {
  const jwtExpired = useJwtExpirationCheck();
  const sessionSigsExpired =  useLitSessionSigsExpirationCheck();
  const litNodeClientQuery = useLitNodeClientReadyQuery();
  const authMethodQuery = useLitAuthMethodQuery();
  const litAccountQuery = useLitAccountQuery(authMethodQuery.data);
  const sessionSigsQuery = useLitSessionSigsQuery(authMethodQuery.data, litAccountQuery.data);
  const pkpWalletQuery = usePkpWallet();
  const nonceQuery = useNonce();
  const signatureQuery = useSignature();
  const supabaseJWTQuery = useSupabaseJWT();
  const supabaseClientQuery = useSupabaseClient();
  const isOnboardedQuery = useIsOnboarded();
  const hasBalanceQuery = useHasBalance();
  const setIsLoading = useSetAtom(isLoadingAtom);


  const isLoading =
    litNodeClientQuery.isLoading ||
      authMethodQuery.isLoading ||
      litAccountQuery.isLoading ||
      sessionSigsQuery.isLoading ||
      pkpWalletQuery.isLoading ||
      nonceQuery.isLoading ||
      signatureQuery.isLoading ||
      supabaseJWTQuery.isLoading ||
      supabaseClientQuery.isLoading ||
      isOnboardedQuery.isLoading ||
      hasBalanceQuery.isLoading;

  const isSuccess =
    litNodeClientQuery.isSuccess &&
      authMethodQuery.isSuccess &&
      litAccountQuery.isSuccess &&
      sessionSigsQuery.isSuccess &&
      pkpWalletQuery.isSuccess &&
      nonceQuery.isSuccess &&
      signatureQuery.isSuccess &&
      supabaseJWTQuery.isSuccess &&
      supabaseClientQuery.isSuccess &&
      isOnboardedQuery.isSuccess &&
      hasBalanceQuery.isSuccess;

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);


  return {
    authMethodQuery,
    litAccountQuery,
    sessionSigsQuery,
    pkpWalletQuery,
    nonceQuery,
    signatureQuery,
    supabaseJWTQuery,
    supabaseClientQuery,
    isOnboardedQuery,
    hasBalanceQuery,
    isLoading,
    isSuccess
  };
};

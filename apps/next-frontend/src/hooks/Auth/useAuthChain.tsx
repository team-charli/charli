//useAuthChain.tsx
import { isSignInRedirect } from "@lit-protocol/lit-auth-client";
import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, useIsLitLoggedInQuery, usePkpWalletQuery, useNonceQuery, useSignatureQuery, useSupabaseClientQuery, useSupabaseJWTQuery,  useHasBalanceQuery, useIsOnboardedQuery } from "./index";
import { isJwtExpired } from "@/utils/app"
import { useAuthChainManager } from "./useAuthChainManager";
import { useIsSignInRedirectQuery } from "./LitAuth/useIsSignInRedirectQuery";
import { useEffect } from "react";
const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthChain = () => {
  const { authChainManagerQuery, invalidateQueries } = useAuthChainManager();
  const isLitConnectedQuery = useLitNodeClientReadyQuery();
  const isSigninRedirectQuery = useIsSignInRedirectQuery()

  console.log('isLitConnectedQuery state:', {
    data: isLitConnectedQuery.data,
    isError: isLitConnectedQuery.isError,
    isSuccess: isLitConnectedQuery.isSuccess,
    isFetching: isLitConnectedQuery.isFetching
  });

  console.log('isSigninRedirectQuery state:', {
    data: isSigninRedirectQuery.data,
    isError: isSigninRedirectQuery.isError,
    isSuccess: isSigninRedirectQuery.isSuccess,
    isFetching: isSigninRedirectQuery.isFetching
  });

  const authMethodQuery = useLitAuthMethodQuery({
    queryKey: ['authMethod'],
    enabledDeps: (isLitConnectedQuery.data ?? false) && (isSigninRedirectQuery.data ?? false)
  });

  console.log('authMethodQuery state:', {
    data: authMethodQuery.data,
    isError: authMethodQuery.isError,
    isSuccess: authMethodQuery.isSuccess,
    isFetching: authMethodQuery.isFetching,
    enabled: (isLitConnectedQuery.data ?? false) && (isSigninRedirectQuery.data ?? false)
  });

  const litAccountQuery = useLitAccountQuery({
    queryKey: ['litAccount', authMethodQuery.isSuccess],
    enabledDeps: !!authMethodQuery.data,
    queryFnData: authMethodQuery.data
  });

  console.log('litAccountQuery state:', {
    data: litAccountQuery.data,
    isError: litAccountQuery.isError,
    isSuccess: litAccountQuery.isSuccess,
    isFetching: litAccountQuery.isFetching,
    enabled: !!authMethodQuery.data
  });

  const sessionSigsQuery = useLitSessionSigsQuery({
    queryKey: ['litSessionSigs'],
    enabledDeps: !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [authMethodQuery.data, litAccountQuery.data],
    invalidateQueries
  });

  console.log('sessionSigsQuery state:', {
    data: sessionSigsQuery.data,
    isError: sessionSigsQuery.isError,
    isSuccess: sessionSigsQuery.isSuccess,
    isFetching: sessionSigsQuery.isFetching,
    enabled: !!litAccountQuery.data && (isLitConnectedQuery.data ?? false)
  });

  const isLitLoggedInQuery = useIsLitLoggedInQuery({
    queryKey: ['isLitLoggedIn'],
    enabledDeps: !!litAccountQuery.data && !!sessionSigsQuery.data,
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data]
  });

  console.log('isLitLoggedInQuery state:', {
    data: isLitLoggedInQuery.data,
    isError: isLitLoggedInQuery.isError,
    isSuccess: isLitLoggedInQuery.isSuccess,
    isFetching: isLitLoggedInQuery.isFetching,
    enabled: !!litAccountQuery.data && !!sessionSigsQuery.data
  });

  const pkpWalletQuery = usePkpWalletQuery({
    queryKey: ['pkpWallet'],
    enabledDeps: !!sessionSigsQuery.data && !!litAccountQuery.data,
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data]
  });

  console.log('pkpWalletQuery state:', {
    data: pkpWalletQuery.data,
    isError: pkpWalletQuery.isError,
    isSuccess: pkpWalletQuery.isSuccess,
    isFetching: pkpWalletQuery.isFetching,
    enabled: !!sessionSigsQuery.data && !!litAccountQuery.data
  });

  const nonceQuery = useNonceQuery({
    queryKey: ['nonce'],
    enabledDeps: !!pkpWalletQuery.data && (isLitLoggedInQuery.data ?? false),
  });

  console.log('nonceQuery state:', {
    data: nonceQuery.data,
    isError: nonceQuery.isError,
    isSuccess: nonceQuery.isSuccess,
    isFetching: nonceQuery.isFetching,
    enabled: !!pkpWalletQuery.data && (isLitLoggedInQuery.data ?? false)
  });

  const nonceQueryData = nonceQuery.data && typeof nonceQuery.data === 'string' ? nonceQuery.data : '';

  const signatureQuery = useSignatureQuery({
    queryKey: ['signature', nonceQueryData],
    enabledDeps: !!nonceQuery.data,
    queryFnData: nonceQuery.data,
    pkpWallet: pkpWalletQuery.data,
  });

  console.log('signatureQuery state:', {
    data: signatureQuery.data,
    isError: signatureQuery.isError,
    isSuccess: signatureQuery.isSuccess,
    isFetching: signatureQuery.isFetching,
    enabled: !!nonceQuery.data
  });
  const signatureQueryData = signatureQuery.data && typeof signatureQuery.data === 'string'? signatureQuery.data: ''

  const supabaseJWTQuery = useSupabaseJWTQuery({
    queryKey: ['supabaseJWT', signatureQueryData ],
    enabledDeps: !!signatureQuery.data && !!litAccountQuery.data && !!nonceQuery.data,
    queryFnData: [litAccountQuery.data, nonceQueryData , signatureQueryData]
  });


  const jwt = supabaseJWTQuery.data && typeof supabaseJWTQuery.data === 'string'&& supabaseJWTQuery.data.length > 10 ? supabaseJWTQuery.data : '';

  const supabaseClientQuery = useSupabaseClientQuery({
    queryKey: ['supabaseClient', jwt ],
    enabledDeps: !!jwt?.length && !isJwtExpired(jwt),
    queryFnData: [jwt]
  });

  const isOnboardedQuery = useIsOnboardedQuery({
    queryKey: ['isOnboarded', litAccountQuery.data],
    enabledDeps: !!litAccountQuery.data && !!supabaseClientQuery.data ,
    queryFnData: [litAccountQuery.data],
    supabaseClient: supabaseClientQuery.data
  });
  const hasBalanceQuery = useHasBalanceQuery({
    queryKey: ['hasBalance'],
    enabledDeps: (isOnboardedQuery.data ?? false) && !!pkpWalletQuery.data && !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [pkpWalletQuery.data, litAccountQuery.data]
  });

  const queries = [
    { name: 'litNodeClient', query: isLitConnectedQuery },
    { name: 'authMethod', query: authMethodQuery },
    { name: 'litAccount', query: litAccountQuery },
    { name: 'sessionSigs', query: sessionSigsQuery },
    { name: 'isLitLoggedIn', query: isLitLoggedInQuery},
    { name: 'pkpWallet', query: pkpWalletQuery },
    { name: 'nonce', query: nonceQuery },
    { name: 'signature', query: signatureQuery },
    { name: 'supabaseJWT', query: supabaseJWTQuery },
    { name: 'supabaseClient', query: supabaseClientQuery },
    { name: 'isOnboarded', query: isOnboardedQuery },
    { name: 'hasBalance', query: hasBalanceQuery },
  ];

  const isLoading = queries.some(q => q.query.isLoading);
  const isError = queries.some(q => q.query.isError);
  const isSuccess = !isLoading && !isError;

  console.log('Overall auth chain state:', {
    isLoading,
    isError,
    isSuccess,
    errorQueries: queries.filter(q => q.query.isError).map(q => q.name)
  });

  return {
    queries,
    isLoading,
    isError,
    isSuccess,
  };
};

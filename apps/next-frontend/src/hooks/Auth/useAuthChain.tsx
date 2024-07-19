//useAuthChain.tsx
import { isSignInRedirect } from "@lit-protocol/lit-auth-client";
import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, useIsLitLoggedInQuery, usePkpWalletQuery, useNonceQuery, useSignatureQuery, useSupabaseClientQuery, useSupabaseJWTQuery,  useHasBalanceQuery, useIsOnboardedQuery } from "./index";
import { isJwtExpired } from "@/utils/app"
import { useMemo } from "react";
import { useAuthChainManager } from "./useAuthChainManager";
const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthChain = () => {
  const litNodeClientQuery = useLitNodeClientReadyQuery();
  const {checkAndInvalidate} = useAuthChainManager()
  const authMethodQuery = useLitAuthMethodQuery({
    queryKey: ['authMethod'],
    enabledDeps: (litNodeClientQuery.data ?? false) && isSignInRedirect(redirectUri)
  });

  const litAccountQuery = useLitAccountQuery({
    queryKey: ['litAccount', authMethodQuery.isSuccess],
    enabledDeps: !!authMethodQuery.data,
    queryFnData: authMethodQuery.data
  });

  const sessionSigsQuery = useLitSessionSigsQuery({
    queryKey: ['litSessionSigs'],
    enabledDeps:  !!litAccountQuery.data && !!litNodeClientQuery.data,
    queryFnData: [authMethodQuery.data, litAccountQuery.data]
  });

  const isLitLoggedInQuery = useIsLitLoggedInQuery({
    queryKey: ['isLitLoggedIn'],
    enabledDeps: !!litAccountQuery.data && !!sessionSigsQuery.data,
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data]
  });

  const pkpWalletQuery = usePkpWalletQuery({
    queryKey:   ['pkpWallet'],
    enabledDeps: !!sessionSigsQuery.data && !!litAccountQuery.data,
    queryFnData:  [litAccountQuery.data, sessionSigsQuery.data]
  });

  const nonceQuery = useNonceQuery({
    queryKey: ['nonce'],
    enabledDeps: !!pkpWalletQuery.data && (isLitLoggedInQuery.data ?? false),
  });
  const nonceQueryData = nonceQuery.data && typeof nonceQuery.data === 'string'? nonceQuery.data: '';

  const signatureQuery = useSignatureQuery({
    queryKey: ['signature', nonceQueryData],
    enabledDeps: !!nonceQuery.data,
    queryFnData: nonceQuery.data,
    pkpWallet: pkpWalletQuery.data,

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
    enabledDeps: (isOnboardedQuery.data ?? false) && !!pkpWalletQuery.data && !!litAccountQuery.data && (litNodeClientQuery.data ?? false),
    queryFnData: [pkpWalletQuery.data, litAccountQuery.data]
  });

  const queries = [
    { name: 'litNodeClient', query: litNodeClientQuery },
    { name: 'authMethod', query: authMethodQuery },
    { name: 'litAccount', query: litAccountQuery },
    { name: 'sessionSigs', query: sessionSigsQuery },
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

  return {
    queries,
    isLoading,
    isError,
    isSuccess,
  };
};

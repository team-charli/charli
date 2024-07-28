//useAuthChain.tsx
import { useRouter } from 'next/router';

import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, useIsLitLoggedInQuery, usePkpWalletQuery, useSupabaseClientQuery,  useHasBalanceQuery, useIsOnboardedQuery } from "./index";

import { useIsSignInRedirectQuery } from "./LitAuth/useIsSignInRedirectQuery";
import { useInvalidateAuthQueries } from "./useInvalidateAuthQueries";
const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthChain = () => {
  const router = useRouter();

  const isLitConnectedQuery = useLitNodeClientReadyQuery();

  const signinRedirectQuery = useIsSignInRedirectQuery({
    queryKey: ['isSignInRedirect', router?.asPath],
    enabledDeps: router.isReady,
    queryFnData: [redirectUri]
  })
  const invalidateQueries = useInvalidateAuthQueries();

  const authMethodQuery = useLitAuthMethodQuery({
    queryKey: ['authMethod'],
    enabledDeps: !!signinRedirectQuery.data ?? false,
    queryFnData: [!!signinRedirectQuery.data ?? false]
  });

  const litAccountQuery = useLitAccountQuery({
    queryKey: ['litAccount', authMethodQuery.isSuccess],
    enabledDeps: !!authMethodQuery.data,
    queryFnData: authMethodQuery.data
  });

  const sessionSigsQuery = useLitSessionSigsQuery({
    queryKey: ['litSessionSigs'],
    enabledDeps: !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [authMethodQuery.data, litAccountQuery.data, isLitConnectedQuery.data ?? false ],
    invalidateQueries
  });

  const isLitLoggedInQuery = useIsLitLoggedInQuery({
    queryKey: ['isLitLoggedIn'],
    enabledDeps: !!litAccountQuery.data && !!sessionSigsQuery.data,
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data]
  });

  const pkpWalletQuery = usePkpWalletQuery({
    queryKey: ['pkpWallet'],
    enabledDeps: !!sessionSigsQuery.data && !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data]
  });


  const supabaseClientQuery = useSupabaseClientQuery({
    queryKey: ['supabaseClient', signinRedirectQuery.data?.idToken],
    enabledDeps: !!signinRedirectQuery.data ?? false,
    queryFnData: [signinRedirectQuery.data]
  });

  const isOnboardedQuery = useIsOnboardedQuery({
    queryKey: ['isOnboarded', litAccountQuery.data],
    enabledDeps: !!litAccountQuery.data && !!supabaseClientQuery.data ,
    queryFnData: [litAccountQuery.data],
    supabaseClient: supabaseClientQuery.data
  });

  // const hasBalanceQuery = useHasBalanceQuery({
  //   queryKey: ['hasBalance'],
  //   enabledDeps: isOnboardedQuery.isSuccess && (!!pkpWalletQuery.data ?? false) && !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
  //   queryFnData: [pkpWalletQuery.data, litAccountQuery.data]
  // });

  const queries = [
    { name: 'litNodeClient', query: isLitConnectedQuery },
    { name: 'authMethod', query: authMethodQuery },
    { name: 'litAccount', query: litAccountQuery },
    { name: 'sessionSigs', query: sessionSigsQuery },
    { name: 'isLitLoggedIn', query: isLitLoggedInQuery},
    { name: 'pkpWallet', query: pkpWalletQuery },
    { name: 'supabaseClient', query: supabaseClientQuery },
    { name: 'isOnboarded', query: isOnboardedQuery },
    // { name: 'hasBalance', query: hasBalanceQuery },
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

//useAuthChain.tsx
import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, useIsLitLoggedInQuery, usePkpWalletQuery, useSupabaseClientQuery,  useHasBalanceQuery, useIsOnboardedQuery } from "./index";
import { useIsSignInRedirectQuery } from "./LitAuth/useIsSignInRedirectQuery";
import { useInvalidateAuthQueries } from "./useInvalidateAuthQueries";
import { useSignInSupabaseQuery } from './SupabaseClient/useSignInSupabaseQuery';

export const useAuthChain = () => {
  const invalidateQueries = useInvalidateAuthQueries();

  const isLitConnectedQuery = useLitNodeClientReadyQuery();

  const signinRedirectQuery = useIsSignInRedirectQuery({
    queryKey: ['isSignInRedirect'],
    enabledDeps: true
  })

  const authMethodQuery = useLitAuthMethodQuery({
    queryKey: ['authMethod', signinRedirectQuery.data],
    enabledDeps:  signinRedirectQuery.isSuccess,
    queryFnData: [signinRedirectQuery.data]
  });

  const litAccountQuery = useLitAccountQuery({
    queryKey: ['litAccount'],
    enabledDeps: !!authMethodQuery.data,
    queryFnData: authMethodQuery.data
  });

  const sessionSigsQuery = useLitSessionSigsQuery({
    queryKey: ['litSessionSigs'],
    enabledDeps: !!litAccountQuery.data && !!authMethodQuery.data && (isLitConnectedQuery.data ?? false),
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
    enabledDeps: !!signinRedirectQuery.data?.idToken ?? false,
  });

  const signInSupabaseQuery = useSignInSupabaseQuery({
    queryKey: ['signInSupabase', signinRedirectQuery.data?.idToken],
    enabledDeps: (!!signinRedirectQuery.data?.idToken ?? false) && (!!supabaseClientQuery.data ?? false) && typeof supabaseClientQuery.data?.auth.signInWithIdToken === 'function',
    queryFnData: [signinRedirectQuery.data],
    supabaseClient: supabaseClientQuery.data
  })

  const isOnboardedQuery = useIsOnboardedQuery({
    queryKey: ['isOnboarded', litAccountQuery.data],
    enabledDeps: !!litAccountQuery.data && !!supabaseClientQuery.data,
    queryFnData: [litAccountQuery.data],
    supabaseClient: supabaseClientQuery.data
  });

  const hasBalanceQuery = useHasBalanceQuery({
    queryKey: ['hasBalance', litAccountQuery.data?.ethAddress],
    enabledDeps: isOnboardedQuery.isSuccess && (!!pkpWalletQuery.data ?? false) && typeof pkpWalletQuery.data?.getBalance === 'function' && !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [pkpWalletQuery.data, litAccountQuery.data]
  });

  const queries = [
    { name: 'litNodeClient', query: isLitConnectedQuery },
    { name: 'authMethod', query: authMethodQuery },
    { name: 'litAccount', query: litAccountQuery },
    { name: 'sessionSigs', query: sessionSigsQuery },
    { name: 'isLitLoggedIn', query: isLitLoggedInQuery},
    { name: 'pkpWallet', query: pkpWalletQuery },
    { name: 'supabaseClient', query: supabaseClientQuery },
    { name: 'signInSupabase', query: signInSupabaseQuery},
    { name: 'isOnboarded', query: isOnboardedQuery },
    { name: 'hasBalance', query: hasBalanceQuery },
  ];

  const essentialQueries = [
    'litNodeClient',
    'authMethod',
    'litAccount',
    'sessionSigs',
    'isLitLoggedIn',
    'supabaseClient',
    'isOnboarded',
    'signInSupabase'
  ];

  const isLoading = queries.some(q => essentialQueries.includes(q.name) && q.query.isLoading);
  const isError = queries.some(q => essentialQueries.includes(q.name) && q.query.isError);
  const isAllDataAvailable = queries
  .filter(q => essentialQueries.includes(q.name))
  .every(q => q.query.data !== undefined);
  const isSuccess = !isLoading && !isError && isAllDataAvailable;

  return {
    queries,
    isLoading,
    isError,
    isSuccess,
  };
}

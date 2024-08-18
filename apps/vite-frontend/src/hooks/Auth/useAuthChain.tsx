//useAuthChain.tsx
import { useLitNodeClientReadyQuery, useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, useIsLitLoggedInQuery, usePkpWalletQuery, useSupabaseClientQuery,  useHasBalanceQuery, useIsOnboardedQuery } from "./index";
import { useIsSignInRedirectQuery } from "./LitAuth/useIsSignInRedirectQuery";
import { useInvalidateAuthQueries } from "./useInvalidateAuthQueries";
import { useSignInSupabaseQuery } from './SupabaseClient/useSignInSupabaseQuery';
import { useCallback, useEffect, useMemo, useReducer } from "react";
import {router} from "@/TanstackRouter/router"
import {queryClient, persister, authChainLogger } from "@/App"
import { usePersistedAuthDataQuery } from "./LitAuth/usePersistedAuthDataQuery";
import { UseQueryResult } from "@tanstack/react-query";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";

export const useAuthChain = () => {

  const invalidateQueries = useInvalidateAuthQueries();

  const isLitConnectedQuery = useLitNodeClientReadyQuery();

  const signinRedirectQuery = useIsSignInRedirectQuery({
    queryKey: ['signInRedirect'],
    enabledDeps: true
  })
  const persistedAuthDataQuery = usePersistedAuthDataQuery()

  const authMethodQuery = useLitAuthMethodQuery({
    queryKey: ['authMethod'],
    enabledDeps: (signinRedirectQuery.isSuccess || persistedAuthDataQuery.isSuccess) && (!!signinRedirectQuery.data || !!persistedAuthDataQuery.data),
    queryFnData: [signinRedirectQuery.data || persistedAuthDataQuery.data],
    persister
  });

  const litAccountQuery = useLitAccountQuery({
    queryKey: ['litAccount'],
    enabledDeps: !!authMethodQuery.data,
    queryFnData: authMethodQuery.data,
    persister
  });

  const sessionSigsQuery = useLitSessionSigsQuery({
    queryKey: ['litSessionSigs'],
    enabledDeps: !!litAccountQuery.data && !!authMethodQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [authMethodQuery.data, litAccountQuery.data, isLitConnectedQuery.data ?? false ],
    invalidateQueries,
    persister,
  });

  const isLitLoggedInQuery = useIsLitLoggedInQuery({
    queryKey: ['isLitLoggedIn'],
    enabledDeps: !!litAccountQuery.data && !!sessionSigsQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data],
  });

  const pkpWalletQuery = usePkpWalletQuery({
    queryKey: ['pkpWallet'],
    enabledDeps: !!sessionSigsQuery.data && !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: [litAccountQuery.data, sessionSigsQuery.data]
  });


  const supabaseClientQuery = useSupabaseClientQuery({
    queryKey: ['supabaseClient', signinRedirectQuery.data?.idToken || persistedAuthDataQuery.data?.idToken],
    enabledDeps: (!!signinRedirectQuery.data?.idToken ?? false) || (!!persistedAuthDataQuery.data?.idToken ?? false),
  });


  const signInSupabaseQuery = useSignInSupabaseQuery({
    queryKey: ['signInSupabase', signinRedirectQuery.data?.idToken || persistedAuthDataQuery.data?.idToken],
    enabledDeps: (!!signinRedirectQuery.data?.idToken ?? false) ||  (!!authMethodQuery.data ?? false) && (!!supabaseClientQuery.data ?? false) && typeof supabaseClientQuery.data?.auth.signInWithIdToken === 'function',
    queryFnData: signinRedirectQuery.data || authMethodQuery.data,
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
    enabledDeps: isOnboardedQuery.isSuccess && !!litAccountQuery.data && (isLitConnectedQuery.data ?? false),
    queryFnData: litAccountQuery.data
  });

  const queries = useMemo(() => [
    { name: 'litNodeClient', query: isLitConnectedQuery },
    { name : 'persistedAuthData', query: persistedAuthDataQuery},
    { name: 'authMethod', query: authMethodQuery },
    { name: 'litAccount', query: litAccountQuery },
    { name: 'sessionSigs', query: sessionSigsQuery },
    { name: 'isLitLoggedIn', query: isLitLoggedInQuery},
    { name: 'pkpWallet', query: pkpWalletQuery as UseQueryResult<PKPEthersWallet, Error> },
    { name: 'supabaseClient', query: supabaseClientQuery },
    { name: 'signInSupabase', query: signInSupabaseQuery},
    { name: 'isOnboarded', query: isOnboardedQuery },
    { name: 'hasBalance', query: hasBalanceQuery },

  ], [
      isLitConnectedQuery, persistedAuthDataQuery, authMethodQuery, litAccountQuery, sessionSigsQuery,
      isLitLoggedInQuery, pkpWalletQuery, supabaseClientQuery, signInSupabaseQuery,
      isOnboardedQuery, hasBalanceQuery
    ]);

  const essentialQueries = useMemo(() => [
    'litNodeClient', 'persistedAuthData', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn', 'supabaseClient', 'isOnboarded', 'signInSupabase'
  ], []);

  const isQuerySuccessful = useCallback((query: UseQueryResult) =>
    (!query.isLoading && !query.isError && query.data !== undefined) || query.isSuccess,
    []
  );

  const { isSuccess, isLoading, isError } = useMemo(() => {
    const essentialQueryObjects = queries.filter(q => essentialQueries.includes(q.name as typeof essentialQueries[number]));
    return {
      isSuccess: essentialQueryObjects.every(q => isQuerySuccessful(q.query)),
      isLoading: essentialQueryObjects.some(q => q.query.isLoading),
      isError: essentialQueryObjects.some(q => q.query.isError)
    };
  }, [queries, essentialQueries, isQuerySuccessful]);

  useEffect(() => {
    authChainLogger.info('Auth Chain State:', { isLoading, isError, isSuccess });
    authChainLogger.info('Detailed query states:');
    queries
      .filter(q => essentialQueries.includes(q.name as typeof essentialQueries[number]))
      .forEach(({name, query}) => {
        authChainLogger.info(`${name}:`, {
          isLoading: query.isLoading,
          isError: query.isError,
          hasData: query.data !== undefined,
          isSuccess: query.isSuccess,
          isFetching: query.isFetching,
        });
      });

    if (isSuccess) {
      authChainLogger.info("Auth chain completed successfully");
      router.invalidate();
    }
  }, [isLoading, isError, isSuccess, queries, essentialQueries]);

  return {
    queries,
    isLoading,
    isError,
    isSuccess,
  };
};

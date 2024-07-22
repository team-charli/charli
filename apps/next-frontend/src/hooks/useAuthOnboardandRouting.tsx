//useAuthOnboardAndRouting.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAuth, useIsOnboarded, useIsLitLoggedIn, useLitNodeClientReady, useJwt } from '@/contexts/AuthContext';
import { useIsSignInRedirectQuery } from '@/hooks/Auth/LitAuth/useIsSignInRedirectQuery';
import { sessionSigsExpired, isJwtExpired } from '@/utils/app';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useInvalidateAuthQueries } from './Auth/useInvalidateAuthQueries';
import { SupabaseClient } from '@supabase/supabase-js';

export const useAuthOnboardAndRouting = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { queries, isLoading, isSuccess } = useAuth();
  const isOnboardedQuery = useIsOnboarded();
  const { data: isOnboarded } = isOnboardedQuery;
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  const areAuthQueriesSettled = queries
  // .filter(q => q.name !== 'hasBalance')
  .every(q => q.query.isSuccess || q.query.isError);
  const jwt = useJwt();
  const { data: isOAuthRedirect } = useIsSignInRedirectQuery();
  const invalidateQueries = useInvalidateAuthQueries();

  const authChainManagerQuery = useQuery({
    queryKey: ['authChainManager'],
    queryFn: async () => {
      console.log(`AuthChainManager running. Current URL: ${router.asPath}`);

      const querySequence = [ 'litNodeClient', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn', 'pkpWallet', 'nonce', 'signature', 'supabaseJWT', 'supabaseClient', 'isOnboarded', 'hasBalance' ];

      for (const queryName of querySequence) {
        const queryData = queryClient.getQueryData([queryName]);

        if (!queryData) {
          console.log(`${queryName} data missing. Fetching...`);
          await queryClient.refetchQueries({ queryKey: [queryName] });
        } else if (queryName === 'sessionSigs' && sessionSigsExpired(queryData as SessionSigs)) {
          console.log('Session sigs expired. Refetching...');
          await queryClient.refetchQueries({ queryKey: [queryName] });
        } else if (queryName === 'supabaseJWT' && isJwtExpired(queryData as string)) {
          console.log('JWT expired. Refetching...');
          await queryClient.refetchQueries({ queryKey: [queryName] });
        }

        // Recheck after potential refetch
        const updatedData = queryClient.getQueryData([queryName]);
        if (!updatedData) {
          if (['litNodeClient', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn'].includes(queryName)) {
            console.log(`Critical data (${queryName}) still missing after refetch. Redirecting to login.`);
            return 'redirect_to_login';
          } else {
            console.log(`Non-critical data (${queryName}) still missing after refetch. Continuing...`);
          }
        }
      }

      return 'continue';
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchIntervalInBackground: true,
    enabled: true,
    staleTime: 0,
  });

  useQuery({
    queryKey: ['authRouting', router.asPath, authChainManagerQuery.data, isLoading, isSuccess, isOAuthRedirect, isLitLoggedIn, isOnboarded],
    queryFn: async () => {
      console.log('authRouting query executing');

      // Ensure authChainManager is up-to-date
      if (authChainManagerQuery.isStale) {
        await authChainManagerQuery.refetch();
      }

      if (authChainManagerQuery.data === 'redirect_to_login' && router.pathname !== '/login') {
        console.log('Routing-- Auth chain check requires reauth, redirecting to login');
        router.push('/login');
        return null;
      }

      const { route, reason } = getTargetRoute();
      console.log(`Routing-- Target Route: ${route}, Reason: ${reason}`);

      if (route && router.pathname !== route) {
        console.log(`Attempting to navigate from ${router.pathname} to ${route}`);
        try {
          await router.push(route);
          console.log(`Navigation to ${route} successful`);
        } catch (error) {
          console.error(`Navigation to ${route} failed:`, error);
        }
      } else {
        console.log(`No navigation needed. Current route: ${router.pathname}`);
      }

      return null;
    },
    enabled: !authChainManagerQuery.isFetching && areAuthQueriesSettled && !isOnboardedQuery.isLoading,
  });

  function getTargetRoute() {
    // console.log('getTargetRoute -- isLitLoggedIn:', isLitLoggedIn);
    // console.log('getTargetRoute -- isOnboarded:', isOnboarded);
    if (typeof window === 'undefined') return { route: null, reason: 'SSR' };

    if (isLoading) return { route: null, reason: `isLoading: ${isLoading}, Queries: ${queries.filter(q => q.query.isLoading).map(q => q.name).join(', ')}` };

    if (!isSuccess) return { route: null, reason: `isSuccess: ${isSuccess}, Failed Queries: ${queries.filter(q => q.query.isError).map(q => q.name).join(', ')}` };

    if (isOAuthRedirect) return { route: null, reason: `isOAuthRedirect: ${isOAuthRedirect}` };

    if (isLitLoggedIn && isOnboarded === false) return { route: '/onboard', reason: `isLitLoggedIn: ${isLitLoggedIn}, isOnboarded: ${isOnboarded}` };

    if (isLitLoggedIn && isOnboarded) return { route: '/lounge', reason: `isLitLoggedIn: ${isLitLoggedIn}, isOnboarded: ${isOnboarded}` };

    if (!isLitLoggedIn) return { route: '/login', reason: `isLitLoggedIn: ${isLitLoggedIn}` };

    console.log('getTargetRoute -- No conditions met');

    return { route: null, reason: 'Unexpected state' };
  }

  return { invalidateQueries };
};

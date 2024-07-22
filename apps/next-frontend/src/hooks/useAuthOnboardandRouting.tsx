//useAuthOnboardAndRouting.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAuth, useIsOnboarded, useIsLitLoggedIn, useLitNodeClientReady, useJwt } from '@/contexts/AuthContext';
import { useIsSignInRedirectQuery } from '@/hooks/Auth/LitAuth/useIsSignInRedirectQuery';
import { sessionSigsExpired, isJwtExpired } from '@/utils/app';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useInvalidateAuthQueries } from './Auth/useInvalidateAuthQueries';
import { useEffect } from 'react';

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
      console.log(`Current URL: ${router.asPath} -- from authChainManager`);

      const litNodeClientReady = queryClient.getQueryData(['litNodeClientReady']) as boolean | undefined;
      const authMethod = queryClient.getQueryData(['authMethod']) as AuthMethod | undefined;
      const litAccount = queryClient.getQueryData(['litAccount']) as IRelayPKP | undefined;
      const sessionSigs = queryClient.getQueryData(['litSessionSigs']) as SessionSigs | undefined;
      const pkpWallet = queryClient.getQueryData(['pkpWallet']) as PKPEthersWallet | undefined;
      const jwt = queryClient.getQueryData(['supabaseJWT']) as string | undefined;

      if (!litNodeClientReady) {
        await queryClient.refetchQueries({ queryKey: ['litNodeClientReady'] });
        return 'continue';
      }

      if (!authMethod) {
        return 'redirect_to_login';
      }

      if (!litAccount) {
        return 'redirect_to_login'
      }

      if (!sessionSigs || sessionSigsExpired(sessionSigs)) {
        console.log('Session sigs expired');
        await invalidateQueries();
        return 'redirect_to_login';
      }

      if (!pkpWallet) {
        await queryClient.refetchQueries({ queryKey: ['pkpWallet'] });
        return 'continue';
      }

      if (!jwt || isJwtExpired(jwt)) {
        console.log('JWT expired or missing');
        return await invalidateQueries();
      }

      return 'continue';
    },
    refetchInterval: 30000 * 10, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    enabled: true,
    staleTime: 0,
  });

  useQuery({
    queryKey: ['authRouting', isLoading, isSuccess, isOAuthRedirect, authChainManagerQuery.data, isLitLoggedIn, isOnboarded],
    queryFn: async () => {
      // console.log('authRouting query executing');
      // console.log('Current pathname:', router.pathname);
      // console.log('authRouting query executing');
      // console.log('isLoading:', isLoading);
      // console.log('isSuccess:', isSuccess);
      // console.log('isOAuthRedirect:', isOAuthRedirect);
      // console.log('authChainManagerQuery.data:', authChainManagerQuery.data);
      // console.log(`Current URL: ${router.asPath} -- from authRouting`);
      // console.log({isLitLoggedIn, isOnboarded});

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
  // console.log('authRouting query enabled:', !authChainManagerQuery.isFetching && areAuthQueriesSettled && !isOnboardedQuery.isLoading);
  // useEffect(() => {
  //   console.log('Auth routing conditions:');
  //   console.log('- authChainManager not fetching:', !authChainManagerQuery.isFetching);
  //   console.log('- areAuthQueriesSettled:', areAuthQueriesSettled);
  //   console.log('- isOnboardedQuery not loading:', !isOnboardedQuery.isLoading);
  // }, [authChainManagerQuery.isFetching, areAuthQueriesSettled, isOnboardedQuery.isLoading]);
  // useEffect(() => {
  //   console.log('Auth queries status:');
  //   queries.forEach(q => {
  //     console.log(`- ${q.name}: isSuccess=${q.query.isSuccess}, isError=${q.query.isError}, isLoading=${q.query.isLoading}`);
  //   });
  //   console.log('areAuthQueriesSettled:', areAuthQueriesSettled);
  // }, [queries, areAuthQueriesSettled]);
    // useEffect(() => {
  //   console.log('isOnboarded updated:', isOnboarded);
  // useEffect(() => {
  //   const logCurrentUrl = () => {
  //     console.log(`Current URL: ${window.location.href} (pathname: ${router.pathname}, asPath: ${router.asPath})`);
  //   };

  //   // Log initial URL
  //   logCurrentUrl();

  //   // Log URL on each route change
  //   const handleRouteChange = (url: string) => {
  //     console.log(`Route changed to: ${url}`);
  //     logCurrentUrl();
  //   };

  //   router.events.on('routeChangeComplete', handleRouteChange);

  //   return () => {
  //     router.events.off('routeChangeComplete', handleRouteChange);
  //   };
  // }, [router]);

  return { invalidateQueries };
};

// src/hooks/useTanStackRouter.ts
import { createRootRoute, createRoute, Outlet, redirect, useRouter } from '@tanstack/react-router';
import LoginPage from '@/pages/login';
import OnboardPage from '@/pages/onboard';
import LoungePage from '@/pages/lounge';
import { useAuth, useSessionSigs, useIsLitLoggedIn, useIsOnboarded, useLitAccount } from '@/contexts/AuthContext';
import { sessionSigsExpired } from '@/utils/app';
import { useQueryClient } from '@tanstack/react-query';
import { routingLogger } from "@/pages/_app";


import { AppProps as NextAppProps } from 'next/app';
import { NextRouter } from 'next/router';

type AppProps = Omit<NextAppProps, 'router'> & { router?: NextRouter };
export const useTanStackRouter = ({ Component, pageProps }: AppProps) => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const sessionSigsQuery = useSessionSigs();
  const isLitLoggedInQuery = useIsLitLoggedIn();
  const isOnboardedQuery = useIsOnboarded();
  const litAccountQuery = useLitAccount();

  const rootRoute = createRootRoute({
    component: () => <Component {...pageProps} />,
    beforeLoad: async ({ location }) => {
      routingLogger.info(`Checking auth state for path: ${location.pathname}`);

      if (!auth.isSuccess) {
        routingLogger.info('Auth chain not successful, waiting...');
        return; // Wait for auth chain to complete
      }

      const isLitLoggedIn = isLitLoggedInQuery.data;
      const isOnboarded = isOnboardedQuery.data;
      const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);

      if (isLitLoggedIn && !isOnboarded && (location.pathname !== '/onboard' || isOAuthRedirect)) {
        routingLogger.info('Redirecting to /onboard');
        throw redirect({ to: '/onboard' });
      }

      if (isLitLoggedIn && isOnboarded && location.pathname !== '/lounge') {
        routingLogger.info('Redirecting to /lounge');
        throw redirect({ to: '/lounge' });
      }

      if (!isLitLoggedIn && location.pathname !== '/login') {
        routingLogger.info('Not logged in, redirecting to /login');
        throw redirect({ to: '/login' });
      }

      // Check for session expiration
      if (sessionSigsQuery.data && sessionSigsExpired(sessionSigsQuery.data)) {
        routingLogger.info('Session expired, invalidating queries and redirecting to /login');
        queryClient.invalidateQueries({queryKey:['authChain']});
        throw redirect({ to: '/login' });
      }

      routingLogger.info(`No navigation needed. Current route: ${location.pathname}`);
    },
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginPage,
  });

  const onboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/onboard',
    component: OnboardPage,
  });

  const loungeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/lounge',
    component: LoungePage,
  });

  const routeTree = rootRoute.addChildren([loginRoute, onboardRoute, loungeRoute]);

  return { routeTree };
};

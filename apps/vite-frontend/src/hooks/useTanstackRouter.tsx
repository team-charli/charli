// src/hooks/useTanStackRouter.ts

import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router';
import Login from '@/pages/login';
import OnboardPage from '@/pages/onboard';
import LoungePage from '@/pages/lounge';
import { useAuth, useSessionSigs, useIsLitLoggedIn, useIsOnboarded, useLitAccount } from '@/contexts/AuthContext';
import { sessionSigsExpired } from '@/utils/app';
import { useQueryClient } from '@tanstack/react-query';
import { routingLogger } from "@/App";
import Entry from '@/pages/Entry';

export const useTanStackRouter = () => {
  routingLogger.info('Initializing TanStack Router');

  const queryClient = useQueryClient();
  const auth = useAuth();
  const sessionSigsQuery = useSessionSigs();
  const isLitLoggedInQuery = useIsLitLoggedIn();
  const isOnboardedQuery = useIsOnboarded();
  const litAccountQuery = useLitAccount();

  routingLogger.info('Auth state:', {
    authSuccess: auth.isSuccess,
    isLitLoggedIn: isLitLoggedInQuery.data,
    isOnboarded: isOnboardedQuery.data,
    hasSessionSigs: !!sessionSigsQuery.data
  });

  const rootRoute = createRootRoute({
    component: () => {
      routingLogger.info('Rendering root route');
      return <Outlet />;
    },
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => {
      routingLogger.info('Rendering index route');
      return <Entry />;
    },
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => {
      routingLogger.info('Rendering login route');
      return <Login />;
    },
  });

  const beforeLoadCheck = async ({ location }: any) => {
    routingLogger.info(`Checking auth state for path: ${location.pathname}`);

    if (!auth.isSuccess) {
      routingLogger.info('Auth chain not successful, waiting...');
      return;
    }

    const isLitLoggedIn = isLitLoggedInQuery.data;
    const isOnboarded = isOnboardedQuery.data;
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);

    routingLogger.info('Auth state details:', { isLitLoggedIn, isOnboarded, isOAuthRedirect });

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

    if (sessionSigsQuery.data && sessionSigsExpired(sessionSigsQuery.data)) {
      routingLogger.info('Session expired, invalidating queries and redirecting to /login');
      queryClient.invalidateQueries({queryKey:['authChain']});
      throw redirect({ to: '/login' });
    }

    routingLogger.info(`No navigation needed. Current route: ${location.pathname}`);
  };

  const onboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/onboard',
    component: () => {
      routingLogger.info('Rendering onboard route');
      return <OnboardPage />;
    },
    beforeLoad: beforeLoadCheck,
  });

  const loungeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/lounge',
    component: () => {
      routingLogger.info('Rendering lounge route');
      return <LoungePage />;
    },
    beforeLoad: beforeLoadCheck,
  });

  const routeTree = rootRoute.addChildren([indexRoute, loginRoute, onboardRoute, loungeRoute]);

  routingLogger.info('Route tree created', { routes: routeTree.children.map(r => r.path) });

  return { routeTree };
};

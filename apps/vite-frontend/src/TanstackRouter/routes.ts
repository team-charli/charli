//routes.ts
import Login from '@/pages/login'
import OnboardPage from '@/pages/onboard'
import LoungePage from '@/pages/lounge'
import { createRootRouteWithContext, createRoute, Outlet, redirect } from '@tanstack/react-router'
import Entry from '@/pages/Entry'
import { RouterContext } from './router'
import { routingLogger } from "@/App";

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  beforeLoad: ({ context, location }) => {
    const { auth } = context;
    if (!auth.isSuccess) {
      routingLogger.info('Auth chain not ready');
      console.log(`Rendering route: ${location.pathname}`, new Date().getTime());
      // Instead of returning, we can throw a redirect to a loading page if needed
      // throw redirect({ to: '/loading' });
      // Or, we can simply return and let the child routes handle their own logic
      return;
    }
    // If auth is ready, we don't need to return anything
  }
})

export const entry = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry,
  beforeLoad: ({ context, location }) => {
    const { queryClient, auth } = context;
    if (!auth.isSuccess) {
      routingLogger.info('Auth not ready, waiting...');
      return;
    }

    const litAccount = queryClient.getQueryData(['litAccount']);
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);
    if (isOAuthRedirect) routingLogger.info({isOAuthRedirect})

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('Conditions met for routing to /onboard');
      throw redirect({ to: '/onboard' });
    }
    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('Conditions met for routing to /lounge');
      throw redirect({ to: '/lounge' });
    }
    if (!isLitLoggedIn) {
      routingLogger.info('Not logged in, redirecting to /login');
      throw redirect({ to: '/login' });
    }

    routingLogger.info(`No navigation needed. Current route: ${location.pathname}`);
    routingLogger.info('--- End of routing logic ---');
  }
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: ({ context, location }) => {
    const { queryClient, auth } = context;
    if (!auth.isSuccess) {
      routingLogger.info('Auth not ready, waiting...');
      return;
    }
    const litAccount = queryClient.getQueryData(['litAccount']);
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);

    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);
    if (isOAuthRedirect) routingLogger.info({isOAuthRedirect})


    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('isLitLoggedIn && isOnboarded === false: routing to /onboard');
      throw redirect({ to: '/onboard' });
    }
    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('isLitLoggedIn && isOnboarded: routing to /lounge');
      throw redirect({ to: '/lounge' });
    }
    if (!isLitLoggedIn) {
      routingLogger.info('!isLitLoggedIn: redirecting to /login');
      throw redirect({ to: '/login' });
    }
    if (isOnboarded === false) {
      routingLogger.info('!isOnbaorded (but is logged in): redirecting to /');
      throw redirect({ to: '/' });
    }

  }
})

export const onboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboard',
  component: OnboardPage,
  beforeLoad: ({ context, location }) => {
    const { queryClient, auth } = context;
    if (!auth.isSuccess) {
      routingLogger.info('Auth not ready, waiting...');
      return;
    }
    const litAccount = queryClient.getQueryData(['litAccount']);
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);
    if (isOAuthRedirect) routingLogger.info({isOAuthRedirect})

    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('isLitLoggedIn && isOnboarded: routing to /lounge');
      throw redirect({ to: '/lounge' });
    }

    if (!isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('!isLitLoggedIn && !isOnboarded: routing to /');
      throw redirect({ to: '/' });
    }
    if (!isLitLoggedIn) {
      routingLogger.info('!isLitLoggedIn: redirecting to /login');
      throw redirect({ to: '/login' });
    }

    if (isOnboarded === false) {
      routingLogger.info('!isOnbaorded (but is logged in): redirecting to /');
      throw redirect({ to: '/' });
    }

  }
})

export const loungeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungePage,
  beforeLoad: ({ context, location }) => {
    const { queryClient, auth } = context;
    if (!auth.isSuccess) {
      routingLogger.info('Auth not ready, waiting...');
      return;
    }
    const litAccount = queryClient.getQueryData(['litAccount']);
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);
    if (isOAuthRedirect) routingLogger.info({isOAuthRedirect})

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('isLitLoggedIn && isOnboarded === false: routing to /onboard');
      throw redirect({ to: '/onboard' });
    }

    if (!isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('!isLitLoggedIn && !isOnboarded: routing to /');
      throw redirect({ to: '/' });
    }

    if (!isLitLoggedIn) {  /* -------------------- */
      routingLogger.info('Not logged in, redirecting to /login');
      throw redirect({ to: '/login' });
    }

    if (isOnboarded === false) {  /* -------------------- */
      routingLogger.info('!isOnbaorded (but is logged in): redirecting to /');
      throw redirect({ to: '/' });
    }
  }
})

export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
])

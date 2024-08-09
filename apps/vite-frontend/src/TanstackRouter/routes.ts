//routes.ts
import Login from '@/pages/login'
import OnboardPage from '@/pages/onboard'
import LoungePage from '@/pages/lounge'
import { createRootRouteWithContext, createRoute, Outlet, redirect } from '@tanstack/react-router'
import Entry from '@/pages/Entry'
import { RouterContext } from './router'
import { routingLogger } from "@/App";
import { entryRouteQueries } from './RouteQueries/entryRouteQueries'
import { loginRouteQueries } from './RouteQueries/loginRouteQueries'
import { onboardRouteQueries } from './RouteQueries/onboardRouteQueries'
import { loungeRouteQueries } from './RouteQueries/loungeRouteQueries'

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  // shouldReload: (match) => {
  //   console.log('shouldReload called with match:', match.context.auth);
  //   // Always return true to force a reload on every change
  //   return true;
  // },
  beforeLoad: ({ context }) => {
    const { auth } = context;
    console.log('Loader called:', {
      route: 'rootRoute',
      auth,
    });
    if (!auth.isSuccess) {
      routingLogger.info('root route: auth state', auth );
      // Instead of returning, we can throw a redirect to a loading page if needed throw redirect({ to: '/loading' });
      // Or, we can simply return and let the child routes handle their own logic
      return;
    }
    routingLogger.info("entry route", auth)

    // If auth is ready, we don't need to return anything
  }
})

export const entry = createRoute({
  // shouldReload: (match) => {
  //   console.log('shouldReload called with match:', match.context.auth);
  //   // Always return true to force a reload on every change
  //   return true;
  // },
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry,
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    console.log('Loader called:', {
      route: 'entry', // change this for each route
    });

    if (!auth.isSuccess) {
      routingLogger.info('entry route: authState', auth);
      return;
    }

    const {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect} = entryRouteQueries(queryClient);

    routingLogger.info("entry route", {litAccount: !!litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect, authState:auth})

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
  }
})

export const loginRoute = createRoute({
  // shouldReload: (match) => {
  //   console.log('shouldReload called with match:', match.context.auth);
  //   // Always return true to force a reload on every change
  //   return true;
  // },
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    console.log('Loader called:', {
      route: 'login', // change this for each route
      auth,
    });
    if (!auth.isSuccess) {
      routingLogger.info('login route: authState', auth);
      return;
    }

    const {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect } = loginRouteQueries(queryClient);

    routingLogger.info("loginRoute", {litAccount: !!litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect, authState: auth })


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
  // shouldReload: (match) => {
  //   console.log('shouldReload called with match:', match.context.auth);
  //   // Always return true to force a reload on every change
  //   return true;
  // },
  getParentRoute: () => rootRoute,
  path: '/onboard',
  component: OnboardPage,
  beforeLoad: ({ context, }) => {
    const { queryClient, auth } = context;
    console.log('Loader called:', {
      route: 'onboard',
      auth,
    });
    if (!auth.isSuccess) {
      routingLogger.info('onboard route: auth state', auth);
      return;
    }
    const {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect} = onboardRouteQueries(queryClient);

    routingLogger.info("onboard route", {litAccount: !!litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect, authState: auth})

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
  // shouldReload: (match) => {
  //   console.log('shouldReload called with match:', match.context.auth);
  //   // Always return true to force a reload on every change
  //   return true;
  // },
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungePage,
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    console.log('Loader called:', {
      route: 'lounge', // change this for each route
      auth,
    });
    if (!auth.isSuccess) {
      routingLogger.info('lounge route: auth state', auth);
      return;
    }
    const {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect} = loungeRouteQueries(queryClient);

    routingLogger.info("lounge route", {litAccount: !!litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect, authState: auth})

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

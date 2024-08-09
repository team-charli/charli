//routes.ts
import Login from '@/pages/login'
import { createRootRouteWithContext, createRoute, ErrorComponent, Outlet, redirect } from '@tanstack/react-router'
import Entry from '@/pages/Entry'
import { RouterContext } from './router'
import { routingLogger } from "@/App";
import { entryRouteQueries } from './RouteQueries/entryRouteQueries'
import { loginRouteQueries } from './RouteQueries/loginRouteQueries'
import { onboardRouteQueries } from './RouteQueries/onboardRouteQueries'
import { loungeRouteQueries } from './RouteQueries/loungeRouteQueries'
import LoungeRoute from '@/pages/lounge/LoungeRoute'
import OnboardRoute from '@/pages/onboard/OnboardRoute'

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  onError: ({ error }) => {console.error(error)},
  errorComponent: ErrorComponent ,
  beforeLoad: ({ context }) => {
    const { auth, queryClient } = context;
    routingLogger.info('Loader called:', { route: 'rootRoute', auth });
    if (!auth.isConnected)
    if (!auth.isSuccess) {
      routingLogger.info('root route: auth state', auth );
      return;
    }
    routingLogger.info("entry route", auth)
  }
})

export const entry = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry,
  onError: ({ error }) => { console.error(error) },

  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    routingLogger.info('Loader called:', { route: 'entry'});
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
  getParentRoute: () => rootRoute,
  path: '/login',

  component: Login,
  onError: ({ error }) => {
    // Log the error
    console.error(error)
  },


  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    routingLogger.info('Loader called:', {
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
  getParentRoute: () => rootRoute,
  path: '/onboard',
  component: OnboardRoute,
  onError: ({ error }) => {console.error(error) },
  beforeLoad: ({ context, }) => {
    const { queryClient, auth } = context;
    routingLogger.info('Loader called:', {
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
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungeRoute,
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    // console.log("auth.isSuccess --- lounge route", auth.isSuccess);
    routingLogger.info('Loader called:', { route: 'lounge'});

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

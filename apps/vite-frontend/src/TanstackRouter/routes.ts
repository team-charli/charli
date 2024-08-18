//routes.ts
import LoginRoute from '@/pages/login'
import RoomRoute from '@/pages/room[id]/Room'
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
import BolsaRoute from '@/pages/bolsa/BolsaRoute';
import { sessionSigsExNearReAuth } from './RouteQueries/sessionSigsExNearReAuth'
import { supabaseExpNearReAuth } from './RouteQueries/supabaseExpNearReAuth'
import { signOutComplete } from './RouteQueries/signOutComplete'

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  onError: error => { console.error(error) },
  errorComponent: ErrorComponent,
  beforeLoad: async ({ context }) => {
    const { auth, queryClient } = context;
    if (!auth.isSuccess) {
      return;
    }

    routingLogger.info("root route");
    const threshold = 900; // seconds

    // try {
    //   const sessionSigsNearReAuth = sessionSigsExNearReAuth(queryClient, threshold);

    //   if (sessionSigsNearReAuth) {
    //     console.log("sessionSigsNearReAuth");
    //     signOutComplete(queryClient);
    //     throw redirect({ to: '/login' });
    //   }

    //   const supabaseTokenNearEx = await supabaseExpNearReAuth(queryClient, threshold);

    //   if (supabaseTokenNearEx) {
    //     console.log("supabaseTokenNearEx");
    //     signOutComplete(queryClient);
    //     throw redirect({ to: '/login' });
    //   }
    // } catch (error) {
    //   console.error("Error in beforeLoad:", error);
    //   // Handle error, possibly redirecting to an error page
    // }
  }
})

export const entry = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry,
  onError: error  => { console.error(error)},

  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    if (!auth.isSuccess) {
      return;
    }

    const {isOnboarded, isLitLoggedIn} = entryRouteQueries(queryClient);
    routingLogger.info("entry route")


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

  component: LoginRoute,
  onError: ({ error }) => {
    // Log the error
    console.error(error)
  },
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    if (!auth.isSuccess) {
      return;
    }

    const {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect, hasBalance } = loginRouteQueries(queryClient);

    routingLogger.info("loginRoute")


    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('isLitLoggedIn && isOnboarded === false: routing to /onboard');
      throw redirect({ to: '/onboard' });
    }

    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('isLitLoggedIn && isOnboarded: routing to /lounge');
      throw redirect({ to: '/lounge' });
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
    if (!auth.isSuccess) {
      return;
    }
    const {isOnboarded, isLitLoggedIn} = onboardRouteQueries(queryClient);

    routingLogger.info("onboard route")

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
  }
})

export const loungeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungeRoute,
  onError: ({ error }) => {console.error(error) },
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    const {isOnboarded, isLitLoggedIn} = loungeRouteQueries(queryClient);

    if (!auth.isSuccess) {
      return;
    }

    routingLogger.info("lounge route")

    if (isLitLoggedIn && isOnboarded === false) { /* -------------------- */
      routingLogger.info('isLitLoggedIn && isOnboarded === false: routing to /onboard');
      throw redirect({ to: '/onboard' });
    }

    if (!isLitLoggedIn && isOnboarded === false) { /* -------------------- */
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

export const bolsaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bolsa',
  component: BolsaRoute
})

export const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/room/$id',
  component: RoomRoute,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      roomRole: search.roomRole as string,
      sessionId: search.sessionId as string,
    }
  },
})

export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
  roomRoute,
  bolsaRoute,
])

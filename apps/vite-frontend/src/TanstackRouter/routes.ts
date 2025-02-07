//routes.ts

import { createRootRouteWithContext, createRoute, ErrorComponent, Outlet, redirect } from '@tanstack/react-router';
import { RouterContext } from './router';
import { routingLogger } from "@/App";

// Your page components
import Entry from '@/pages/Entry';
import LoginRoute from '@/pages/login';
import OnboardRoute from '@/pages/onboard/OnboardRoute';
import LoungeRoute from '@/pages/lounge/LoungeRoute';
import BolsaRoute from '@/pages/bolsa/BolsaRoute';
import RoomRoute from '@/pages/room[id]/Room';

// Query-based logic
import { entryRouteQueries } from './RouteQueries/entryRouteQueries';
import { loginRouteQueries } from './RouteQueries/loginRouteQueries';
import { onboardRouteQueries } from './RouteQueries/onboardRouteQueries';
import { loungeRouteQueries } from './RouteQueries/loungeRouteQueries';

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  onError: (err) => { console.error(err) },
  errorComponent: ErrorComponent,
  beforeLoad: async ({ context }) => {
    if (!context?.auth || !context.auth.isSuccess) return;
    routingLogger.info("root route");
  },
});

// Example “Entry” route
export const entry = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry,
  onError: (err) => { console.error(err) },

  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    if (!context?.auth || !context.auth.isSuccess) return;

    const { isOnboarded, isLitLoggedIn } = entryRouteQueries(queryClient);
    routingLogger.info("entry route: deciding if we need to redirect");

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('Routing to /onboard');
      throw redirect({ to: '/onboard' });
    }
    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('Routing to /lounge');
      throw redirect({ to: '/lounge' });
    }
    if (!isLitLoggedIn) {
      routingLogger.info('Routing to /login');
      throw redirect({ to: '/login' });
    }
  },
});

// /login
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRoute,
  onError: ({ error }) => console.error(error),
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    if (!context?.auth || !context.auth.isSuccess) return;

    const { isOnboarded, isLitLoggedIn } = loginRouteQueries(queryClient);
    if (isLitLoggedIn && isOnboarded === false) {
      throw redirect({ to: '/onboard' });
    }
    if (isLitLoggedIn && isOnboarded) {
      throw redirect({ to: '/lounge' });
    }
  },
});

// /onboard
export const onboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboard',
  component: OnboardRoute,
  onError: ({ error }) => console.error(error),
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    if (!context?.auth || !context.auth.isSuccess) return;

    const { isOnboarded, isLitLoggedIn } = onboardRouteQueries(queryClient);
    if (isLitLoggedIn && isOnboarded) {
      throw redirect({ to: '/lounge' });
    }
    if (!isLitLoggedIn && isOnboarded === false) {
      throw redirect({ to: '/' });
    }
    if (!isLitLoggedIn) {
      throw redirect({ to: '/login' });
    }
  },
});

// /lounge
export const loungeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungeRoute,
  onError: ({ error }) => console.error(error),
  beforeLoad: ({ context }) => {
    const { queryClient, auth } = context;
    if (!context?.auth || !context.auth.isSuccess) return;

    const { isOnboarded, isLitLoggedIn } = loungeRouteQueries(queryClient);

    if (isLitLoggedIn && isOnboarded === false) {
      throw redirect({ to: '/onboard' });
    }
    if (!isLitLoggedIn && isOnboarded === false) {
      throw redirect({ to: '/' });
    }
    if (!isLitLoggedIn) {
      throw redirect({ to: '/login' });
    }
    if (isOnboarded === false) {
      throw redirect({ to: '/' });
    }
  },
});

// /bolsa
export const bolsaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bolsa',
  component: BolsaRoute,
});

// /room/$id
export const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/room/$id',
  component: RoomRoute,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      roomRole: search.roomRole as 'teacher' | 'learner',
      sessionId: search.sessionId as string,
      hashedLearnerAddress: search.hashedLearnerAddress as string,
      hashedTeacherAddress: search.hashedTeacherAddress as string,
    };
  },
});

// Create the final route tree
export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
  roomRoute,
  bolsaRoute,
]);

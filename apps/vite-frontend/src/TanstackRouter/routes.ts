// routes.ts
import { createRootRouteWithContext, createRoute, ErrorComponent, Outlet, redirect } from '@tanstack/react-router'
import { RouterContext } from './router'
import { routingLogger } from '@/App'

// Page components
import Entry from '@/pages/Entry'
import LoginRoute from '@/pages/login'
import OnboardRoute from '@/pages/onboard/OnboardRoute'
import LoungeRoute from '@/pages/lounge/LoungeRoute'
import BolsaRoute from '@/pages/bolsa/BolsaRoute'
import RoomRoute from '@/pages/room[id]/Room'

// Query-based logic
import { entryRouteQueries } from './RouteQueries/entryRouteQueries'
import { loginRouteQueries } from './RouteQueries/loginRouteQueries'
import { onboardRouteQueries } from './RouteQueries/onboardRouteQueries'
import { loungeRouteQueries } from './RouteQueries/loungeRouteQueries'
import RoomSummary from '@/pages/room[id]-summary/RoomSummary'

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  onError: (err) => {
    console.error(err)
  },
  errorComponent: ErrorComponent,

  // Run before loading child routes:
  beforeLoad: async ({ context }) => {
    routingLogger.debug('rootRoute -> beforeLoad invoked')

    if (!context?.auth || !context.auth.isSuccess) {
      routingLogger.debug('rootRoute: auth chain not ready or isError. Doing nothing.')
      return
    }

    routingLogger.info('root route: auth.isSuccess = true')
  },
})

// Example “Entry” route
export const entry = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry,
  onError: (err) => {
    console.error(err)
  },

  beforeLoad: ({ context }) => {
    routingLogger.debug('entry route -> beforeLoad invoked')

    const { queryClient, auth } = context
    if (!auth || !auth.isSuccess) {
      routingLogger.debug('entry route: auth not ready, returning early.')
      return
    }

    const { isOnboarded, isLitLoggedIn } = entryRouteQueries(queryClient)
    routingLogger.info(`entry route: deciding redirect -> isLitLoggedIn=${isLitLoggedIn}, isOnboarded=${isOnboarded}`)

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('Routing to /onboard')
      throw redirect({ to: '/onboard' })
    }
    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('Routing to /lounge')
      throw redirect({ to: '/lounge' })
    }
    if (!isLitLoggedIn) {
      routingLogger.info('Routing to /login')
      throw redirect({ to: '/login' })
    }
  },
})

// /login
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRoute,
  onError: ({ error }) => console.error(error),

  beforeLoad: ({ context }) => {
    routingLogger.debug('login route -> beforeLoad invoked')

    const { queryClient, auth } = context
    if (!auth || !auth.isSuccess) {
      routingLogger.debug('login route: auth not ready, returning early.')
      return
    }

    const { isOnboarded, isLitLoggedIn } = loginRouteQueries(queryClient)
    routingLogger.info(`login route: isLitLoggedIn=${isLitLoggedIn}, isOnboarded=${isOnboarded}`)

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('login route -> redirect to /onboard')
      throw redirect({ to: '/onboard' })
    }
    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('login route -> redirect to /lounge')
      throw redirect({ to: '/lounge' })
    }
  },
})

// /onboard
export const onboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboard',
  component: OnboardRoute,
  onError: ({ error }) => console.error(error),

  beforeLoad: ({ context }) => {
    routingLogger.debug('onboard route -> beforeLoad invoked')

    const { queryClient, auth } = context
    if (!auth || !auth.isSuccess) {
      routingLogger.debug('onboard route: auth not ready, returning early.')
      return
    }

    const { isOnboarded, isLitLoggedIn } = onboardRouteQueries(queryClient)
    routingLogger.info(`onboard route: isLitLoggedIn=${isLitLoggedIn}, isOnboarded=${isOnboarded}`)

    if (isLitLoggedIn && isOnboarded) {
      routingLogger.info('onboard route -> redirect to /lounge')
      throw redirect({ to: '/lounge' })
    }
    if (!isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('onboard route -> redirect to /')
      throw redirect({ to: '/' })
    }
    if (!isLitLoggedIn) {
      routingLogger.info('onboard route -> redirect to /login')
      throw redirect({ to: '/login' })
    }
  },
})

// /lounge
export const loungeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungeRoute,
  onError: ({ error }) => console.error(error),

  beforeLoad: ({ context }) => {
    routingLogger.debug('lounge route -> beforeLoad invoked')

    const { queryClient, auth } = context
    if (!auth || !auth.isSuccess) {
      routingLogger.debug('lounge route: auth not ready, returning early.')
      return
    }

    const { isOnboarded, isLitLoggedIn } = loungeRouteQueries(queryClient)
    routingLogger.info(`lounge route: isLitLoggedIn=${isLitLoggedIn}, isOnboarded=${isOnboarded}`)

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('lounge route -> redirect to /onboard')
      throw redirect({ to: '/onboard' })
    }
    if (!isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('lounge route -> redirect to /')
      throw redirect({ to: '/' })
    }
    if (!isLitLoggedIn) {
      routingLogger.info('lounge route -> redirect to /login')
      throw redirect({ to: '/login' })
    }
    if (isOnboarded === false) {
      routingLogger.info('lounge route -> redirect to /')
      throw redirect({ to: '/' })
    }
  },
})

// /bolsa
export const bolsaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bolsa',
  component: BolsaRoute,
})

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
      controllerAddress: search.controllerAddress as string
    }
  },
})

// /room-summary/$id
export const roomSummaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/room-summary/$id',
  component: RoomSummary,
  // Your validation logic for params, etc.
})

// Create the final route tree
export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
  roomRoute,
  roomSummaryRoute,
  bolsaRoute,
])

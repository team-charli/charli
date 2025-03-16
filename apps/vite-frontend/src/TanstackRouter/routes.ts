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
import SessionHistoryRoute from '@/pages/session-history/SessionHistory'
// Query-based logic
import { entryRouteQueries } from './RouteQueries/entryRouteQueries'
import { loginRouteQueries } from './RouteQueries/loginRouteQueries'
import { onboardRouteQueries } from './RouteQueries/onboardRouteQueries'
import { loungeRouteQueries } from './RouteQueries/loungeRouteQueries'
import { SupabaseClient } from '@supabase/supabase-js'

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
});


// Corrected loader using your existing setup:

export const sessionHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/session-history',
  component: SessionHistoryRoute,
  loader: async ({ context }) => {
    const queryClient = context.queryClient;

    const signinRedirectData = queryClient.getQueryData<{ idToken?: string }>(['signInRedirect']);
    const persistedAuthData = queryClient.getQueryData<{ idToken?: string }>(['persistedAuthData']);

    const idToken = signinRedirectData?.idToken || persistedAuthData?.idToken;

    const supabaseClient = queryClient.getQueryData(['supabaseClient', idToken]) as SupabaseClient | undefined;

    if (!supabaseClient) throw new Error('Supabase client unavailable');

    // Retrieve the currently logged-in user's data directly
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unable to retrieve user data');

    const userId = localStorage.getItem('userID');
    if (!userId) throw new Error('no storage for userID key')

    // Continue with your existing logic...
    const queryKey = ['sessionHistory', userId];

    const sessions = await queryClient.fetchQuery({
      queryKey,
      queryFn: async () => {
        const { data, error } = await supabaseClient
          .from('finalized_user_sessions')
          .select('session_id, role, teaching_lang, finalized_ipfs_cid, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
      },
    });

    // Prefetch IPFS session data concurrently
    await Promise.all(
      sessions.map(session =>
        queryClient.prefetchQuery({
          queryKey: ['ipfsData', session.finalized_ipfs_cid],
          queryFn: () =>
            fetch(`https://ipfs-proxy-worker.charli.chat/ipfs/${session.finalized_ipfs_cid}`).then(res => res.json()),
          staleTime: Infinity,
        })
      )
    );

    return sessions;
  },
});



// Create the final route tree
export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
  roomRoute,
  sessionHistoryRoute,
  bolsaRoute,
])

// routes.ts
import { createRootRouteWithContext, createRoute, ErrorComponent, Outlet, redirect } from '@tanstack/react-router'
import { RouterContext } from './router'
import { routingLogger } from '@/App'
// Removed Layout import to preserve original routing behavior

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
import { EnhancedMistake } from '@/types/types'
import RoboTest from '@/pages/robo-test/RoboTest'

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
  onError: ({ error }) => console.error(error),

  beforeLoad: ({ context }) => {
    routingLogger.debug('bolsa route -> beforeLoad invoked');

    const { queryClient, auth } = context
    if (!auth || !auth.isSuccess) {
      routingLogger.debug('bolsa route: auth not ready, returning early.');
      return
    }

    const { isOnboarded, isLitLoggedIn } = loungeRouteQueries(queryClient)
    routingLogger.info(`bolsa route: isLitLoggedIn=${isLitLoggedIn}, isOnboarded=${isOnboarded}`);

    if (isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('bolsa route -> redirect to /onboard');
      throw redirect({ to: '/onboard' });
    }
    if (!isLitLoggedIn && isOnboarded === false) {
      routingLogger.info('bolsa route -> redirect to /');
      throw redirect({ to: '/' });
    }
    if (!isLitLoggedIn) {
      routingLogger.info('bolsa route -> redirect to /login');
      throw redirect({ to: '/login' });
    }
    if (isOnboarded === false) {
      routingLogger.info('bolsa route -> redirect to /');
      throw redirect({ to: '/' });
    }
  },
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
      controllerAddress: search.controllerAddress as string,
      roboTest: search.roboTest as string,
      deepgramQA: search.deepgramQA as string
    }
  },
});


export const sessionHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/session-history',
  component: SessionHistoryRoute,
  loader: async ({ context }) => {
    const { queryClient } = context
    const userId = localStorage.getItem('userID')
    if (!userId) throw new Error('no storage for userID key')

    const supabaseClient = queryClient.getQueryData(['supabaseClient']) as SupabaseClient | undefined
    if (!supabaseClient) throw new Error('Supabase client unavailable')

    // 1. base rows ---------------------------------------------------------------------------
    const { data: sessions, error: sErr } = await supabaseClient
      .from('finalized_user_sessions')
      .select('session_id, role, teaching_lang, finalized_ipfs_cid, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (sErr) throw sErr
    if (!sessions.length) return { sessions: [], accuracyTrend: [] }

    const ids = sessions.map((s) => s.session_id)

    const { data: scorecards, error: scErr } = await supabaseClient
      .from('learner_scorecards')
      .select('session_id, conversation_difficulty, language_accuracy')
      .in('session_id', ids)
    if (scErr) throw scErr

    const { data: mistakes, error: mErr } = await supabaseClient
      .from('learner_mistakes')
      .select('id, session_id, type, text, correction, lemma_fingerprint')
      .in('session_id', ids)
    if (mErr) throw mErr

    // 2. lifetime averages -------------------------------------------------------------------
    const totalSessions = sessions.length
    const lifetimeCounts: Record<string, number> = {}
    for (const m of mistakes) {
      const fp = m.lemma_fingerprint ?? `${m.text} → ${m.correction}`
      lifetimeCounts[fp] = (lifetimeCounts[fp] ?? 0) + 1
    }
    const lifetimeAvg: Record<string, number> = {}
    Object.entries(lifetimeCounts).forEach(([fp, cnt]) => {
      lifetimeAvg[fp] = cnt / totalSessions
    })

    // 3. per-session enrichment --------------------------------------------------------------
    const chronological = [...sessions].reverse()  // oldest → newest
    const windowSize = 3
    const sliding: Record<string, number[]> = {}   // fp -> recent % list
    const enrichedBySession = new Map<number, EnhancedMistake[]>()

    for (const sess of chronological) {
      const rows = mistakes.filter((m) => m.session_id === sess.session_id)
      const total = rows.length || 1

      const byFp: Record<string, number> = {}
      for (const m of rows) {
        const fp = m.lemma_fingerprint ?? `${m.text} → ${m.correction}`
        byFp[fp] = (byFp[fp] ?? 0) + 1
      }

      for (const m of rows) {
        const fp = m.lemma_fingerprint ?? `${m.text} → ${m.correction}`
        const count = byFp[fp]
        const pct = count / total

        const prev = sliding[fp] ?? []
        const meanPrev = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null
        let trend: 'up' | 'down' | null = null
        if (meanPrev !== null && Math.abs(pct - meanPrev) >= 0.05) {
          trend = pct > meanPrev ? 'up' : 'down'
        }

        const color = pct > 0.33 ? 'red' : pct >= 0.10 ? 'yellow' : 'green'

        const enhanced: EnhancedMistake = {
          ...m,
          avg_frequency: lifetimeAvg[fp] ?? 0,
          trend_arrow: trend,
          session_frequency_color: color,
          session_count: count
        }
        if (!enrichedBySession.has(sess.session_id)) enrichedBySession.set(sess.session_id, [])
        enrichedBySession.get(sess.session_id)!.push(enhanced)
      }

      // update sliding window
      Object.keys(byFp).forEach((fp) => {
        const pct = byFp[fp] / total
        sliding[fp] = [...(sliding[fp] ?? []), pct].slice(-windowSize)
      })
    }

    // 4. assemble ---------------------------------------------------------------------------
    const scMap = new Map(scorecards.map((sc) => [sc.session_id, sc]))
    const enriched = sessions.map((s) => ({
      ...s,
      scorecard: {
        ...scMap.get(s.session_id),
        mistakes:
        enrichedBySession.get(s.session_id)?.sort(
          (a, b) => b.session_count - a.session_count
        ) ?? []
      }
    }))

    const accuracyTrend = enriched
    .slice()
    .reverse()
    .map((s, idx) => ({ idx: idx + 1, accuracy: s.scorecard.language_accuracy }))

    // 5. pre-fetch IPFS ---------------------------------------------------------------------
    await Promise.all(
      enriched.map((s) =>
        queryClient.prefetchQuery({
          queryKey: ['ipfsData', s.finalized_ipfs_cid],
          queryFn: () =>
            fetch(`https://ipfs-proxy-worker.charli.chat/ipfs/${s.finalized_ipfs_cid}`).then((r) =>
              r.json()
            ),
          staleTime: Infinity
        })
      )
    )

    // NOTE: cast to 'any' so private types don’t leak outside this module
    return { sessions: enriched, accuracyTrend } as any
  }
})

export const roboTestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/robo-test',
  component: RoboTest,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      deepgramQA: search.deepgramQA as string
    }
  }
})




// Create the final route tree
export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
  roomRoute,
  sessionHistoryRoute,
  bolsaRoute,
  roboTestRoute
])

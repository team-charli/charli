// routes.ts
import Login from '@/pages/login'
import OnboardPage from '@/pages/onboard'
import LoungePage from '@/pages/lounge'
import { createRootRouteWithContext, createRoute, Outlet } from '@tanstack/react-router'
import Entry from '@/pages/Entry'
import { RouterContext } from './router'

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
})

export const entry = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Entry
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
})

export const onboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboard',
  component: OnboardPage,
})

export const loungeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lounge',
  component: LoungePage,
})

export const routeTree = rootRoute.addChildren([
  entry,
  loginRoute,
  onboardRoute,
  loungeRoute,
])

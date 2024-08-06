// router.ts
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routes';
import { queryClient } from '../TanstackQuery/queryClient';
import { AuthContextType } from '@/contexts/AuthContext';
import { QueryClient } from '@tanstack/query-core';

export interface RouterContext {
  auth: AuthContextType;
  queryClient: QueryClient;
}

export const router = createRouter({
  routeTree,
  context: {} as RouterContext, // Type assertion here
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

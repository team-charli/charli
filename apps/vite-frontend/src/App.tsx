import log from 'loglevel';
export const authChainLogger = log.getLogger('authChainLogger');
authChainLogger.setLevel('info');
export const routingLogger = log.getLogger('routingLogger');
routingLogger.setLevel('info');

import { Provider } from 'jotai/react';
import { QueryClient } from '@tanstack/react-query';
import '@/styles/globals.css';
import { HuddleProvider } from "@huddle01/react";
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { huddleClient } from './Huddle/huddleClient';
import NotificationProvider from './contexts/NotificationContext';
import SessionProvider from "./contexts/SessionsContext";
import { useTanStackRouter } from './hooks/useTanstackRouter';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Entry from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});


function CharliApp() {
   const { routeTree } = useTanStackRouter();
  const tanstackRouter = createRouter({ routeTree });
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }} >
      <AuthProvider>
        <Provider>
          <ReactQueryDevtools initialIsOpen={false} />
          <NotificationProvider>
            <HuddleProvider client={huddleClient}>
              <SessionProvider>
                <RouterProvider router={tanstackRouter}>
                  <Entry />
                </RouterProvider>
              </SessionProvider>
            </HuddleProvider>
          </NotificationProvider>
        </Provider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
export default CharliApp;


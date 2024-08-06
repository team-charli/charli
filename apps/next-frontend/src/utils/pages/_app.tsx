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
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import React from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import { useAuthOnboardAndRouting } from '@/hooks/useAuthOnboardandRouting';
import { useTanStackRouter } from '@/hooks/useTanstackRouter';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

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

import { AppProps as NextAppProps } from 'next/app';
import { NextRouter } from 'next/router';

type AppProps = Omit<NextAppProps, 'router'> & { router?: NextRouter };

function CharliApp({ Component, pageProps, router }: AppProps) {
  const { routeTree } = useTanStackRouter({ Component, pageProps });
  const tanstackRouter = createRouter({
    routeTree,
    context: {
      queryClient,
      Component,
      pageProps,
    },
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <AuthProvider>
        <Provider>
          <AuthInitializer />
          <ReactQueryDevtools initialIsOpen={false} />
          <NotificationProvider>
            <HuddleProvider client={huddleClient}>
              <SessionProvider>
                <RouterProvider router={tanstackRouter} />
              </SessionProvider>
            </HuddleProvider>
          </NotificationProvider>
        </Provider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

function AuthInitializer() {
  useAuthOnboardAndRouting();
  return null;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

export default CharliApp;


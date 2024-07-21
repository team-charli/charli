import { Provider } from 'jotai/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import React from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import { useAuthOnboardAndRouting } from '@/hooks/useAuthOnboardandRouting'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/contexts/AuthContext';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false, // default: true

    },
  },
})

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined
})
function CharliApp({ Component, pageProps }: AppProps) {
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
                <Component {...pageProps} />
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

export default CharliApp;

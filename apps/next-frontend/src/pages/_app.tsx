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

const queryClient = new QueryClient();

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

function AuthInitializer() {
  useAuthOnboardAndRouting();
  return null;
}

export default CharliApp;

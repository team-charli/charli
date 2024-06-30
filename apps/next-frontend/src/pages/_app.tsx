import { Provider } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import {QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import { ReactNode, StrictMode } from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import AuthOnboardProvider from '@/contexts/AuthOnboardContext';
import  {queryClientAtom } from 'jotai-tanstack-query'
// import { LitClientProvider, useLitClientReady } from '@/contexts/LitClientContext';
// import { LitClientSynchronizer } from '@/components/Lit/LitClientSynchronizer';

function CharliApp({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient();
  const HydrateAtoms = ({ children }: { children: ReactNode }) =>{
    useHydrateAtoms([[queryClientAtom, () => queryClient]]);
    return children;
  };
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Provider>
          <HydrateAtoms>
            <AuthOnboardProvider>
              <NotificationProvider>
                <HuddleProvider client={huddleClient}>
                  <SessionProvider>
                    <Component {...pageProps} />
                  </SessionProvider>
                </HuddleProvider>
              </NotificationProvider>
            </AuthOnboardProvider>
          </HydrateAtoms>
        </Provider>
      </QueryClientProvider>
    </StrictMode>
  );
}
export default CharliApp;

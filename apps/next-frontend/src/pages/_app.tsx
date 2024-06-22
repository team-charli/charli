import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import { StrictMode } from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import AuthOnboardProvider from '@/contexts/AuthOnboardContext';
import { RecoilRoot } from 'recoil';
import { LitClientProvider } from '@/contexts/LitClientContext';
import { LitClientSynchronizer } from '@/components/Lit/LitClientSynchronizer';

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <RecoilRoot>
        <LitClientProvider>
          <LitClientSynchronizer />
          <AuthOnboardProvider>
            <NotificationProvider>
              <HuddleProvider client={huddleClient}>
                <SessionProvider>
                  <Component {...pageProps} />
                </SessionProvider>
              </HuddleProvider>
            </NotificationProvider>
          </AuthOnboardProvider>
        </LitClientProvider>
      </RecoilRoot>

    </StrictMode>
  );
}

export default CharliApp;


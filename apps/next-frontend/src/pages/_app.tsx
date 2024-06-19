import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import { StrictMode } from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import AuthOnboardProvider from '@/contexts/AuthOnboardContext';
import { PkpWalletProvider } from '@/contexts/PkpWalletContext';
import { RecoilRoot } from 'recoil';
import { LitClientProvider } from '@/contexts/LitClientContext';

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <LitClientProvider>
      <RecoilRoot>
        <AuthOnboardProvider>
          <PkpWalletProvider>
            <NotificationProvider>
              <HuddleProvider client={huddleClient}>
                <SessionProvider>
                  <Component {...pageProps} />
                </SessionProvider>
              </HuddleProvider>
            </NotificationProvider>
          </PkpWalletProvider>
        </AuthOnboardProvider>
      </RecoilRoot>
    </LitClientProvider>
    </StrictMode>
  );
}

export default CharliApp;


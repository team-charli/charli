'use client'
import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import { StrictMode } from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import AuthOnboardProvider from '@/contexts/AuthOnboardContext';
import { PkpWalletProvider } from '@/contexts/PkpWalletContext';
import SupabaseProvider from '@/contexts/SupabaseContext';

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <SupabaseProvider>
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
      </SupabaseProvider>
    </StrictMode>
  );
}

export default CharliApp;


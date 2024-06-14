'use client'
import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import NotificationProvider from '@/contexts/NotificationContext';
import SupabaseProvider from '@/contexts/SupabaseContext';
import { StrictMode } from 'react';
import SessionProvider from "@/contexts/SessionsContext";
import AuthOnboardProvider from '@/contexts/AuthOnboardContext';
import { PkpWalletProvider } from '@/contexts/PkpWalletContext';

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <AuthOnboardProvider>
        <PkpWalletProvider>
          <SupabaseProvider>
            <NotificationProvider>
              <HuddleProvider client={huddleClient}>
                <SessionProvider>
                  <Component {...pageProps} />
                </SessionProvider>
              </HuddleProvider>
            </NotificationProvider>
          </SupabaseProvider>
        </PkpWalletProvider>
      </AuthOnboardProvider>
    </StrictMode>
  );
}

export default CharliApp;


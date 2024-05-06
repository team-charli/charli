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

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <AuthOnboardProvider>
        <SupabaseProvider>
          <NotificationProvider>
            <HuddleProvider client={huddleClient}>
              <SessionProvider>
                <Component {...pageProps} />
              </SessionProvider>
            </HuddleProvider>
          </NotificationProvider>
        </SupabaseProvider>
      </AuthOnboardProvider>
    </StrictMode>
  );
}

export default CharliApp;


import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { HuddleProvider } from "@huddle01/react"
import { huddleClient } from '@/Huddle/huddleClient';
import AuthProvider from '@/contexts/AuthContext';
import NotificationProvider from '@/contexts/NotificationContext';
import OnboardStateProvider from '@/contexts/OnboardContext';
import SupabaseProvider from '@/contexts/SupabaseContext';
import { StrictMode } from 'react';
import SessionProvider from "@/contexts/SessionsContext";

function CharliApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <AuthProvider>
        <SupabaseProvider>
          <NotificationProvider>
            <OnboardStateProvider>
              <HuddleProvider client={huddleClient}>
                <SessionProvider>
                  <Component {...pageProps} />
                </SessionProvider>
              </HuddleProvider>
            </OnboardStateProvider>
          </NotificationProvider>
        </SupabaseProvider>
      </AuthProvider>
    </StrictMode>
  );
}

export default CharliApp;


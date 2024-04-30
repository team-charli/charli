// useAuth.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuthenticate, useLitAccounts, useLitSession } from '../hooks/Lit';
import { SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { sessionSigsExpired } from '@/utils/app';

export const useAuth = () => {
  const router = useRouter();
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (!redirectUrl) throw new Error(`redirectUrl`);

  const { authMethod, authLoading, authError } = useAuthenticate(redirectUrl);
  const { currentAccount, fetchAccounts, accountsLoading, accountsError } = useLitAccounts();
  const { initSession, sessionLoading, sessionError } = useLitSession();
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');

  useEffect(() => {
    void (async () => {
      if (authMethod && currentAccount && !sessionSigs) {
        await initSession(authMethod, currentAccount);
      } else if (authMethod && currentAccount && sessionSigs && sessionSigsExpired(sessionSigs)) {
        await initSession(authMethod, currentAccount);
      } else if (authMethod && !currentAccount) {
        await fetchAccounts(authMethod);
      } else if (!authMethod) {
        await router.push('/login');
      }
    })();
  }, [authMethod, fetchAccounts, currentAccount, initSession, sessionSigs]);

  return { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError };
};

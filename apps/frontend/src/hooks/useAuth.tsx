import { useEffect, useState } from 'react'
import useAuthenticate from '../hooks/Lit/useLitAuthenticate';
import useLitAccounts from '../hooks/Lit/useLitAccount';
import useLitSession from '../hooks/Lit/useLitSession';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../types/types';

export const useAuth = (currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, authSig: AuthSig | null, setCurrentAccount: LocalStorageSetter<IRelayPKP>, setSessionSigs: LocalStorageSetter<SessionSigs>, setAuthSig:LocalStorageSetter<AuthSig>, authMethod: AuthMethod | null, setAuthMethod: LocalStorageSetter<AuthMethod>) => {
  const {
    error: authError,
    loading: authLoading,
  } = useAuthenticate(import.meta.env.VITE_GOOGLE_REDIRECT_URI, setAuthMethod);
  const {
    fetchAccounts,
    error: accountsError,
    loading: accountsLoading,
  } = useLitAccounts();
  const {
    initSession,
    loading: sessionLoading,
    error: sessionError,
  } = useLitSession();

  useEffect(() => {
    if (authMethod) {
      fetchAccounts(authMethod);
    }
  }, [authMethod, fetchAccounts]);

  useEffect(() => {
    if (authMethod && currentAccount) {
      console.log('run initSession');
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);


  return {authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError };
}

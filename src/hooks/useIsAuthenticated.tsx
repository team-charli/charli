import {useEffect} from 'react'
import useAccounts from './Lit/useLitAccount';
import useSession from './Lit/useLitSession';
import useAuthenticate from './Lit/useLitAuthenticate'
import { ORIGIN, signInWithDiscord, signInWithGoogle } from '../utils/lit';

export const useIsAuthenticated = () => {
  const redirectUri = ORIGIN + '/login';
  const {
    authMethod,
    loading: authLoading,
    error: authError,
  } = useAuthenticate(redirectUri);

  const {
    fetchAccounts,
    setCurrentAccount,
    currentAccount,
    accounts,
    loading: accountsLoading,
    error: accountsError,
  } = useAccounts();

  const {
    initSession,
    sessionSigs,
    loading: sessionLoading,
    error: sessionError,
  } = useSession();

  useEffect(() => {
    // If user is authenticated, fetch accounts
    if (authMethod) {
      fetchAccounts(authMethod);
    }
  }, [authMethod, fetchAccounts]);

  useEffect(() => {
    // If user is authenticated and has selected an account, initialize session
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  if (currentAccount && sessionSigs) {
    return true
  } else {
    return false
  }
}



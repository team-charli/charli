import {useEffect, useState} from 'react'
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

const [isAuthenticated, setIsAuthenticated] = useState(false);


useEffect(() => {
  if (currentAccount && sessionSigs) {
      setIsAuthenticated(true);
    } else {
    }
}, [currentAccount, sessionSigs])

  return isAuthenticated
}



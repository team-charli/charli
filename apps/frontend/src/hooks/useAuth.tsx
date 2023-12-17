import { IRelayPKP, SessionSigs, AuthMethod  } from '@lit-protocol/types';
import { useEffect, useState } from 'react'
import useAuthenticate from '../hooks/Lit/useLitAuthenticate';
import useLitAccounts from '../hooks/Lit/useLitAccount';
import useLitSession from '../hooks/Lit/useLitSession';
import { useSupabase } from '../hooks/Supabase/useSupabase'

const [ isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

export const useAuth = () => {

  const {supabaseClient, updateJwt, jwt} = useSupabase()
  const {
    authMethod,
    error: authError,
    loading: authLoading,
  } = useAuthenticate(import.meta.env.VITE_GOOGLE_REDIRECT_URI);
  const {
    fetchAccounts,
    currentAccount,
    error: accountsError,
    loading: accountsLoading,
  } = useLitAccounts();
  const {
    initSession,
    sessionSigs,
    setSessionSigs,
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
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  useEffect(() => {
    if (currentAccount && sessionSigs) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [currentAccount, sessionSigs]);

 return {authMethod, currentAccount, sessionSigs, isAuthenticated, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, supabaseClient, jwt, updateJwt };
}

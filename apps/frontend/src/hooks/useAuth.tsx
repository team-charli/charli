import { useEffect, useState } from 'react'
import useAuthenticate from '../hooks/Lit/useLitAuthenticate';
import useLitAccounts from '../hooks/Lit/useLitAccount';
import useLitSession from '../hooks/Lit/useLitSession';
import { useSupabase } from '../hooks/Supabase/useSupabase'

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


  return {authMethod, currentAccount, sessionSigs, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, supabaseClient, jwt, updateJwt };
}

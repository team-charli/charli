import { useEffect } from 'react'
import { useAuthenticate as useLitAuthenticate, useLitAccounts, useLitSession } from '../hooks/Lit';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../types/types';

export const useAuth = (currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, authSig: AuthSig | null, setCurrentAccount: LocalStorageSetter<IRelayPKP>, setSessionSigs: LocalStorageSetter<SessionSigs>, setAuthSig:LocalStorageSetter<AuthSig>, authMethod: AuthMethod | null, setAuthMethod: LocalStorageSetter<AuthMethod>) => {
const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  if (!redirectUrl) throw new Error(`redirectUrl`)
  const {
    error: authError,
    loading: authLoading,
  } = useLitAuthenticate(redirectUrl , setAuthMethod);

  const {
    fetchAccounts,
    error: accountsError,
    loading: accountsLoading,
  } = useLitAccounts(currentAccount, setCurrentAccount);

  const {
    initSession,
    loading: sessionLoading,
    error: sessionError,
  } = useLitSession();

  useEffect(() => {
    void (async () => {
    if (authMethod) {
      await fetchAccounts(authMethod);
    }
    })();
  }, [authMethod, fetchAccounts]);

  useEffect(() => {
    void (async () => {
    if (authMethod && currentAccount && !sessionSigs) {
      await initSession(authMethod, currentAccount);
    }
    })();
  }, [authMethod, currentAccount, sessionSigs, initSession]);

  return {authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError };
}

import { useAuth } from '../hooks/useAuth'
import {  createContext, useContext, useEffect } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { useIsAuthenticated } from '../hooks/auth/checks/useIsAuthenticated';
export const AuthContext = createContext<AuthContextObj | null>(null);
export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {

const { authMethod, currentAccount, sessionSigs, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, supabaseClient, jwt, updateJwt } = useAuth();

  useEffect(() => {
    const currentAccount = localStorage.getItem('lit-wallet-sig')
    const sessionSigs = localStorage.getItem('lit-session-key')
    if (sessionSigs) console.log('sessionSigs', JSON.parse(sessionSigs));
    if (currentAccount) console.log('currentAccount', JSON.parse(currentAccount))
    } ,[currentAccount, sessionSigs])
  const isAuthenticated = useIsAuthenticated({currentAccount, sessionSigs})

   // const isAuthenticated = null;
  const auth: AuthContextObj = {
    authMethod,
    currentAccount,
    sessionSigs,
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    // setSessionSigs,
    jwt,
    updateJwt,
    supabaseClient,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider


import { useAuth } from '../hooks/useAuth'
import {  createContext, useContext, useEffect } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { useIsAuthenticated } from '../hooks/auth/checks/useIsAuthenticated';
export const AuthContext = createContext<AuthContextObj | null>(null);
export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {

const { authMethod, currentAccount, sessionSigs, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, supabaseClient, jwt, updateJwt } = useAuth();

  const isAuthenticated = useIsAuthenticated();

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


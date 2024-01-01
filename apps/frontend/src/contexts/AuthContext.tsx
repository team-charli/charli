import { useAuth } from '../hooks/useAuth'
import {  createContext, useContext } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { useIsAuthenticated } from '../hooks/auth/checks/useIsAuthenticated';
export const AuthContext = createContext<AuthContextObj | null>(null);

const AuthProvider = ({children}: AuthProviderProps) => {

const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, supabaseClient, /*jwt, updateJwt*/ } = useAuth();

  const isAuthenticated = useIsAuthenticated();

  const auth: AuthContextObj = {
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    authMethod,
    // jwt,
    // updateJwt,
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


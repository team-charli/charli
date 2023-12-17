import { useAuth } from '../hooks/useAuth'
import { useState, createContext, useContext, useEffect} from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
export const AuthContext = createContext<AuthContextObj | null>(null);
export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {
const { isAuthenticated, authMethod, currentAccount, sessionSigs, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, supabaseClient, jwt, updateJwt } = useAuth();


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


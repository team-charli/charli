import { useAuth } from '../hooks/useAuth'
import { createContext, useContext, useEffect } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { defaultAuthContext } from './utils/defaultAUTHcontext';
import useLitLoggedIn from '../hooks/Lit/useLitLoggedIn';
export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {

  const { authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, authMethod } = useAuth();

  const isLitLoggedIn = useLitLoggedIn();
  useEffect(()=> {
    console.log("isLitLoggedIn", isLitLoggedIn)
  }, [isLitLoggedIn])

  const auth: AuthContextObj = {
    authMethod,
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    isLitLoggedIn  //broken reads undefined
  };

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
export const AuthContext = createContext<AuthContextObj>(defaultAuthContext);


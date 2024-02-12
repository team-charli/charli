import { useAuth } from '../hooks/useAuth'
import { createContext, useContext } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { useRehydrate } from '../hooks/utils/useRehydrate';
import { defaultAuthContext } from './utils/defaultAUTHcontext';
import useLitLoggedIn from '../hooks/Lit/useLitLoggedIn';

export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {

  const { currentAccount, sessionSigs, authSig, setCurrentAccount, setSessionSigs, setAuthSig, authMethod, setAuthMethod } = useRehydrate();

  const { authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuth(currentAccount, sessionSigs, authSig, setCurrentAccount, setSessionSigs, setAuthSig, authMethod, setAuthMethod);

  const isLitLoggedIn = useLitLoggedIn();

  const auth: AuthContextObj = {
    authMethod,
    currentAccount,
    sessionSigs,
    authSig,
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    // isLitLoggedIn // broken reads undefined
  };

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
export const AuthContext = createContext<AuthContextObj>(defaultAuthContext);


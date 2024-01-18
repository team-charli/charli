import { useAuth } from '../hooks/useAuth'
import { createContext, useContext } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { useRehydrate } from '../hooks/utils/useRehydrate';
const defaultAuthContext: AuthContextObj = {
    authMethod: undefined, // or a valid default AuthMethod value
    authLoading: false,
    accountsLoading: false,
    sessionLoading: false,
    authError: undefined, // Error | undefined
    accountsError: undefined, // Error | undefined
    sessionError: undefined, // Error | undefined
    currentAccount: null, // IRelayPKP | null
    sessionSigs: null, // SessionSigs | null
    authSig: null, // AuthSig | null
    setCurrentAccount: () => {}, // Dummy function or a valid setter function
    setSessionSigs: () => {}, // Dummy function or a valid setter function
    setAuthSig: () => {}, // Dummy function or a valid setter function
};

export const AuthContext = createContext<AuthContextObj>(defaultAuthContext);

export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {

  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuth();

  const { currentAccount, sessionSigs, authSig, setCurrentAccount, setSessionSigs, setAuthSig } = useRehydrate();

  const auth: AuthContextObj = {
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    authMethod,
    currentAccount,
    sessionSigs,
    authSig,
    setCurrentAccount,
    setSessionSigs,
    setAuthSig,
  };

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider


import { useAuth } from '../hooks/useAuth'
import { createContext, useContext } from 'react'
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { useRehydrate } from '../hooks/utils/useRehydrate';
import useLocalStorage from '@rehooks/local-storage';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs } from '@lit-protocol/types';

const defaultAuthContext: AuthContextObj = {
    authMethod: null, // or a valid default AuthMethod value
    setAuthMethod: () => {},
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


export const useAuthContext = () => useContext(AuthContext);

const AuthProvider = ({children}: AuthProviderProps) => {


  const { currentAccount, sessionSigs, authSig, setCurrentAccount, setSessionSigs, setAuthSig, authMethod, setAuthMethod } = useRehydrate();


  const { authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuth(currentAccount, sessionSigs, authSig, setCurrentAccount, setSessionSigs, setAuthSig, authMethod, setAuthMethod);


  const auth: AuthContextObj = {
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    authMethod,
    setAuthMethod,
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
export const AuthContext = createContext<AuthContextObj>(defaultAuthContext);


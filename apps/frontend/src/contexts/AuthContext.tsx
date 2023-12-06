import { useState, createContext, useContext, useEffect} from 'react'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { AuthContextObj, AuthProviderProps  } from '../types/types'


//TODO: safer check for sigs and auth.  prefer a function that tests it
export const AuthContext = createContext<AuthContextObj | null>(null);
export const useAuthContext = () => useContext(AuthContext);


const AuthProvider = ({children}: AuthProviderProps) => {

  const [contextCurrentAccount, contextSetCurrentAccount] = useState<IRelayPKP | null>(null);
  const [contextSessionSigs, contextSetSessionSigs]  = useState<SessionSigs | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (contextCurrentAccount && contextSessionSigs) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [contextCurrentAccount, contextSessionSigs]);

  const authObj: AuthContextObj = {
    contextSetCurrentAccount,
    contextCurrentAccount,
    contextSessionSigs,
    contextSetSessionSigs,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={authObj}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

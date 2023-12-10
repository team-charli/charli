import { useState, createContext, useContext, useEffect} from 'react'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { AuthContextObj, AuthProviderProps  } from '../types/types'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
export const AuthContext = createContext<AuthContextObj | null>(null);
export const useAuthContext = () => useContext(AuthContext);
const supabaseUrl = "https://onhlhmondvxwwiwnruvo.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY || "";

const AuthProvider = ({children}: AuthProviderProps) => {
  const [jwt, setJwt] = useState(localStorage.getItem('userJWT'));
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    const clientOptions = jwt ? {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    } : {};
    const client = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    setSupabaseClient(client);
  }, [jwt]);

  const [contextCurrentAccount, contextSetCurrentAccount] = useState<IRelayPKP | null>(null);
  const [contextSessionSigs, contextSetSessionSigs]  = useState<SessionSigs | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const updateJwt = (newToken:string) => {
    localStorage.setItem('userJWT', newToken);
    setJwt(newToken);
  };
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
    jwt,
    updateJwt,
    supabaseClient,
  };

  return (
    <AuthContext.Provider value={authObj}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

//OPTIM: safer check for sigs and auth.  prefer a function that tests it

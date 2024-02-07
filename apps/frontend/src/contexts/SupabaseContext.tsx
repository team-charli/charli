import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useFetchJWT } from '../hooks/Supabase/useFetchJWT';
import { SupabaseContextValue, SupabaseProviderProps } from '../types/types';
import { useFetchNonce } from '../hooks/Supabase/useFetchNonce';
import { useAuthContext } from './AuthContext';
import { useLocalStorage } from '@rehooks/local-storage';

const SupabaseContext = createContext<SupabaseContextValue>({ client: null, supabaseLoading: true });

// Adjusting the singleton pattern to work with dynamic JWTs
const supabaseClientSingleton = (() => {
  let instance;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY;

  const createInstance = (jwt: string) => {
    console.log('created supabase instance');

    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
  };

  return {
    getInstance: (jwt: string) => {
      if (!instance) {
        instance = createInstance(jwt);
      }
      return instance;
    }
  };
})();

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const { authSig, currentAccount, sessionSigs } = useAuthContext();
  const [cachedJWT, setCachedJWT] = useLocalStorage('userJWT');
  const nonce = useFetchNonce(currentAccount, sessionSigs, cachedJWT);
  const { loading: jwtLoading, error: jwtError } = useFetchJWT(currentAccount, sessionSigs, authSig, nonce, setCachedJWT, cachedJWT);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (cachedJWT && !supabaseClient) {
      const client = supabaseClientSingleton.getInstance(cachedJWT);
      setSupabaseClient(client);
    }
  }, [cachedJWT, supabaseClient, jwtLoading]); // Ensure nonce is not directly a dependency to avoid re-fetching JWT unnecessarily

  const isLoading = jwtLoading || !supabaseClient;

  return (
    <SupabaseContext.Provider value={{ client: supabaseClient, supabaseLoading: isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextValue => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export default SupabaseProvider;

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseContextValue, SupabaseProviderProps } from '../types/types';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useAuthenticateAndFetchJWT } from '../hooks/Supabase/useAuthenticateAndFetchJWT';

const SupabaseContext = createContext<SupabaseContextValue>({ client: null, supabaseLoading: true });

const supabaseClientSingleton = (() => {
  let instance: SupabaseClient;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY;

  const createInstance = (jwt: string) => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    console.log('created supabase instance', );

    return client
  };

  return {
    getInstance: (jwt: string) => {
      if (jwt !== null && !instance && jwt.length) {
        instance = createInstance(jwt);
      }
      return instance;
    }
  };
})();

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  //attempt to use centralized useLocalStorage in useRehydrate()
  // const { currentAccount, sessionSigs } = useAuthContext();
  // get directly
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const { isLoading: jwtLoading, error: jwtError } = useAuthenticateAndFetchJWT(currentAccount, sessionSigs)
  const [cachedJWT, setCachedJWT] = useLocalStorage<string>('userJWT');
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if ((cachedJWT !== null && Object.keys(cachedJWT).length > 0) && !supabaseClient) {
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

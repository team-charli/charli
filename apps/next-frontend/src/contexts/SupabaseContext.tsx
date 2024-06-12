'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseContextValue, SupabaseProviderProps } from '../types/types';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP } from '@lit-protocol/types';
import { useAuthenticateAndFetchJWT } from '../hooks/Supabase/useAuthenticateAndFetchJWT';
import { isJwtExpired } from '../utils/app';

const SupabaseContext = createContext<SupabaseContextValue>({ supabaseLoading: true, getAuthenticatedClient: async () => null });

const supabaseClientSingleton = (() => {
  let instance: SupabaseClient | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("can't find supabaseUrl and/or supabaseAnonKey");

  const createInstance = (jwt: string) => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    console.log('created supabase instance');
    return client;
  };

  return {
    getInstance: (jwt: string) => {
      if (jwt && jwt.length) {
        instance = createInstance(jwt);
      }
      return instance;
    }
  };
})();

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const { userJWT, isLoading: jwtLoading, authenticateAndFetchJWT } = useAuthenticateAndFetchJWT(currentAccount);
  const [supabaseLoading, setSupabaseLoading] = useState(true);

const getAuthenticatedClient = useCallback(async (): Promise<SupabaseClient | null> => {
  if (!userJWT || isJwtExpired(userJWT)) {
    await authenticateAndFetchJWT();
    if (!userJWT || isJwtExpired(userJWT)) {
      return null;
    }
  }
  return supabaseClientSingleton.getInstance(userJWT!);
}, [userJWT, authenticateAndFetchJWT]);

  useEffect(() => {
    if (userJWT !== null && userJWT.length > 0) {
      (async () => {
        const client = await getAuthenticatedClient();
        setSupabaseLoading(!client);
      })();
    }
  }, [userJWT, getAuthenticatedClient]);

  const isLoading = jwtLoading || supabaseLoading;

  return (
    <SupabaseContext.Provider value={{ supabaseLoading: isLoading, getAuthenticatedClient }}>
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

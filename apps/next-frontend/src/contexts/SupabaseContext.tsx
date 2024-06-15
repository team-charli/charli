// SupabaseContext.tsx
'use client';
import React, { createContext, useContext, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseContextValue, SupabaseProviderProps } from '../types/types';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP } from '@lit-protocol/types';
import { useAuthenticateAndFetchJWT } from '../hooks/Supabase/useAuthenticateAndFetchJWT';
import supabaseClientSingleton from './Utils/supabaseClientSingleton';

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const { userJWT, isLoading } = useAuthenticateAndFetchJWT(currentAccount);

  const supabaseClient: SupabaseClient | null = useMemo(() => {
    if (userJWT) {
      return supabaseClientSingleton.getSupabaseClient(userJWT);
    }
    return null;
  }, [userJWT]);

  return (
    <SupabaseContext.Provider value={{ supabaseClient, supabaseLoading: isLoading }}>
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

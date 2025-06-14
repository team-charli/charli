//AuthContext.tsx
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { SupabaseClient } from '@supabase/supabase-js';
import { UseQueryResult } from '@tanstack/react-query';
import React, { createContext, useContext } from 'react';
import { useAuthChain } from './hooks/Auth/useAuthChain';
import { IRelayPKP } from '@lit-protocol/types';
import { useAddResourceAndRefectchSessionSigsQuery } from './hooks/Auth/LitAuth/useAddResourceAndRefectchSessionSigs';

export type AuthContextType = {
  queries: AuthQuery[];
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
};

interface AuthQuery<T = any> {
  name: string;
  query: UseQueryResult<T, any>;
}
const AuthContext = createContext<{
  queries: AuthQuery[];
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const authChainResult = useAuthChain();

  return (
    <AuthContext.Provider value={authChainResult}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): {
  queries: AuthQuery[];
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
} => {
  const context = useContext(AuthContext);
  if (!context)  throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Helper hooks without specific typings
export const usePkpWallet = () => useAuth().queries.find(q => q.name === 'pkpWallet')?.query as UseQueryResult<PKPEthersWallet, Error>;


export const useLitNodeClientReady = () => useAuth().queries.find(q => q.name === 'litNodeClient')?.query as UseQueryResult<any, any>;
export const useLitAuthMethod = () => useAuth().queries.find(q => q.name === 'authMethod')?.query as UseQueryResult<any, any>;

export const useLitAccount = (): UseQueryResult<IRelayPKP, Error> => {const query = useAuth().queries.find(q => q.name === 'litAccount')?.query;
  if (!query) throw new Error('LitAccount query not found');
  return query as UseQueryResult<IRelayPKP,Error>;
}

export const useSessionSigs = () => useAuth().queries.find(q => q.name === 'sessionSigs')?.query as UseQueryResult<any, any>;
export const useIsLitLoggedIn = () => useAuth().queries.find(q => q.name === 'isLitLoggedIn')?.query as UseQueryResult<any, any>;
export const useIsOnboarded = () => useAuth().queries.find(q => q.name === 'isOnboarded')?.query as UseQueryResult<any, any>;
export const useSupabaseClient = (): UseQueryResult<SupabaseClient, Error> => {
  const query = useAuth().queries.find(q => q.name === 'supabaseClient')?.query;
  if (!query) {
    throw new Error('Supabase client query not found');
  }
  return query as UseQueryResult<SupabaseClient, Error>;
};
export const useSignInSupabase = () => useAuth().queries.find(q => q.name === 'signInSupabase')?.query as UseQueryResult<any, any>;

export const useHasBalance = () => useAuth().queries.find(q => q.name === 'hasBalance')?.query as UseQueryResult<any, any>;

export const useAddResourceAndRefectchSessionSigs = useAddResourceAndRefectchSessionSigsQuery ;



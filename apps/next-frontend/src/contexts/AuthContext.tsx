//AuthContext.tsx
import { useAuthChain } from '@/hooks/Auth/useAuthChain';
import { UseQueryResult } from '@tanstack/react-query';
import React, { createContext, useContext } from 'react';



const AuthContext = createContext<ReturnType<typeof useAuthChain> | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const authChainResult = useAuthChain();
  return <AuthContext.Provider value={authChainResult}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hooks without specific typings
export const useLitNodeClientReady = () => useAuth().queries.find(q => q.name === 'litNodeClient')?.query as UseQueryResult<any, any>;
export const useLitAuthMethod = () => useAuth().queries.find(q => q.name === 'authMethod')?.query as UseQueryResult<any, any>;
export const useLitAccount = () => useAuth().queries.find(q => q.name === 'litAccount')?.query as UseQueryResult<any, any>;
export const useSessionSigs = () => useAuth().queries.find(q => q.name === 'sessionSigs')?.query as UseQueryResult<any, any>;
export const useIsLitLoggedIn = () => useAuth().queries.find(q => q.name === 'isLitLoggedIn')?.query as UseQueryResult<any, any>;
export const useIsOnboarded = () => useAuth().queries.find(q => q.name === 'isOnboarded')?.query as UseQueryResult<any, any>;
export const useJwt = () => useAuth().queries.find(q => q.name === 'supabaseJWT')?.query as UseQueryResult<any, any>;
export const usePkpWallet = () => useAuth().queries.find(q => q.name === 'pkpWallet')?.query as UseQueryResult<any, any>;

// AuthContext.tsx
import { createContext, useContext } from 'react';
import { AuthContextObj, AuthProviderProps } from '../types/types';
import { defaultAuthContext } from './utils/defaultAUTHcontext';
import { useAuthOboard } from '@/hooks/useAuthOnboardandRouting';

export const useAuthOnboardContext = () => useContext(AuthOnboardContext);

const AuthOnboardProvider = ({ children }: AuthProviderProps) => {
  const auth = useAuthOboard();

  return <AuthOnboardContext.Provider value={auth}>{children}</AuthOnboardContext.Provider>;
};

export default AuthOnboardProvider;

export const AuthOnboardContext = createContext<AuthContextObj>(defaultAuthContext);

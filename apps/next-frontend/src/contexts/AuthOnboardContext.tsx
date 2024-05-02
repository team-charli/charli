// AuthContext.tsx
import { createContext, useContext } from 'react';
import { AuthOnboardContextObj, AuthProviderProps } from '../types/types';
import { useAuthOboardRouting } from '@/hooks/useAuthOnboardandRouting';

export const useAuthOnboardContext = () => useContext(AuthOnboardContext);

const AuthOnboardProvider = ({ children }: AuthProviderProps) => {
  const auth = useAuthOboardRouting();

  return <AuthOnboardContext.Provider value={auth}>{children}</AuthOnboardContext.Provider>;
};

export default AuthOnboardProvider;

export const AuthOnboardContext = createContext<AuthOnboardContextObj | null>(null);

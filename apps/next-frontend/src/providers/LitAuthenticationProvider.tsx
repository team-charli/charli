// src/providers/LitAuthenticationProvider.tsx
import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import LitAuthenticateClient from './LitAuthenticateClient';
import { parseAuthMethodFromCookie } from '../utils/parseAuthMethodFromCookie';

interface LitAuthenticationProviderProps {
  children: (props: { authMethod: AuthMethod | null }) => ReactNode;
  redirectUri: string;
}

export default function LitAuthenticationProvider({ children, redirectUri }: LitAuthenticationProviderProps) {
  const cookieStore = cookies();
  const authMethodCookie = cookieStore.get('authMethod');
  const authMethod = authMethodCookie ? parseAuthMethodFromCookie(authMethodCookie.value) : null;

  return (
    <>
      <LitAuthenticateClient redirectUri={redirectUri} />
      {children({ authMethod })}
    </>
  );
}

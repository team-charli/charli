// src/app/LitAuthenticateProvider.tsx
import { ReactNode } from 'react';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { AuthMethod } from '@lit-protocol/types';
import { authenticateWithDiscord, authenticateWithGoogle } from '../utils/lit';

interface LitAuthenticateProviderProps {
  children: (props: { authMethod: AuthMethod | null }) => ReactNode;
  redirectUri: string;
}

export default async function LitAuthenticateProvider({ children, redirectUri }: LitAuthenticateProviderProps) {
  let authMethod: AuthMethod | null = null;

  const authWithGoogle = async (): Promise<AuthMethod | null> => {
    try {
      const result = await authenticateWithGoogle(redirectUri as any);
      return result as AuthMethod;
    } catch (error) {
      console.error('Error authenticating with Google:', error);
      return null;
    }
  };

  const authWithDiscord = async (): Promise<AuthMethod | null> => {
    try {
      const result = await authenticateWithDiscord(redirectUri as any);
      return result as AuthMethod;
    } catch (error) {
      console.error('Error authenticating with Discord:', error);
      return null;
    }
  };

  if (redirectUri && isSignInRedirect(redirectUri)) {
    const providerName = getProviderFromUrl();
    if (providerName === 'google') {
      authMethod = await authWithGoogle();
    } else if (providerName === 'discord') {
      authMethod = await authWithDiscord();
    }
  }

  return <>{children({ authMethod })}</>;
}

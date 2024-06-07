// src/providers/LitAuthenticateClient.tsx
'use client';

import { useEffect } from 'react';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { AuthMethod } from '@lit-protocol/types';
import { authenticateWithDiscord, authenticateWithGoogle } from '../../utils/lit';
import { setAuthMethodAction } from '../../serverActions/setAuthMethodAction';

interface LitAuthenticateClientProps {
  redirectUri: string;
}

export default function LitAuthenticateClient({ redirectUri }: LitAuthenticateClientProps) {
  useEffect(() => {
    const handleAuthentication = async () => {
      if (redirectUri && isSignInRedirect(redirectUri)) {
        const providerName = getProviderFromUrl();
        let authMethod: AuthMethod | null = null;

        if (providerName === 'google') {
          authMethod = await authenticateWithGoogle(redirectUri as any);
        } else if (providerName === 'discord') {
          authMethod = await authenticateWithDiscord(redirectUri as any);
        }

        await setAuthMethodAction(authMethod);
      }
    };

    handleAuthentication();
  }, [redirectUri]);

  return null;
}

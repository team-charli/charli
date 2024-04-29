import { useCallback, useEffect, useState } from 'react';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { AuthMethod } from '@lit-protocol/types';
import { authenticateWithDiscord, authenticateWithGoogle } from '../../utils/lit';
import { LocalStorageSetter } from '../../types/types';

export default function useAuthenticate(redirectUri: string, setAuthMethod: LocalStorageSetter<AuthMethod>) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();

  /**
   * Handle redirect from Google OAuth
   */
  const authWithGoogle = useCallback(async (): Promise<void> => {
      setLoading(true);
      setError(undefined);
      setAuthMethod(null);

      try {
        const result: AuthMethod = (await authenticateWithGoogle(
          redirectUri as any,
        )) as any;
        setAuthMethod(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    // }
  }, [redirectUri, setAuthMethod]);
  /**
   * Handle redirect from Discord OAuth
   */
  const authWithDiscord = useCallback(async (): Promise<void> => {
      setLoading(true);
      setError(undefined);
      setAuthMethod(null);

      try {
        const result: AuthMethod = (await authenticateWithDiscord(
          redirectUri as any
        )) as any;
        console.log('setting authMethod');
        setAuthMethod(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    // }
  }, [redirectUri, setAuthMethod]);


  useEffect(() => {
    if (redirectUri && isSignInRedirect(redirectUri)) {
      const providerName = getProviderFromUrl();
      if (providerName === 'google') {
        authWithGoogle();
      } else if (providerName === 'discord') {
        authWithDiscord();
      }
    }
  }, [redirectUri, authWithGoogle, authWithDiscord]);

  return {
    loading,
    error,
  };
}


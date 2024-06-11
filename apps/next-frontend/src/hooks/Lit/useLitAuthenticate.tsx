import { useCallback, useEffect, useState } from 'react';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { AuthMethod } from '@lit-protocol/types';
import { authenticateWithDiscord, authenticateWithGoogle } from '../../utils/lit';

export default function useAuthenticate(redirectUri: string) {
  const [authLoading, setLoading] = useState<boolean>(false);
  const [authError, setError] = useState<Error>();
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);

  /** Handle redirect from Google OAuth */

  const authWithGoogle = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = (await authenticateWithGoogle(
        redirectUri as any,
      ).catch(error => {console.error(error); throw new Error(error)}))
      setAuthMethod(result as AuthMethod);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
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
        void (async () => {
          await authWithGoogle();
        })();
      } else if (providerName === 'discord') {
        void (async () => {
          await authWithDiscord();
        })();

      }
    }
  }, [redirectUri, authWithGoogle, authWithDiscord]);

  return {
    authMethod,
    authLoading,
    authError,
  };
}


import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { authMethodAtom, isOAuthRedirectAtom, authErrorAtom, litNodeClientReadyAtom} from '@/atoms/atoms';
import { AuthMethod } from '@lit-protocol/types';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useLitAuthMethodQuery = () => {
  const setAuthMethod = useSetAtom(authMethodAtom);
  const setIsOAuthRedirect = useSetAtom(isOAuthRedirectAtom);
  const setAuthError = useSetAtom(authErrorAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);

  return useQuery<AuthMethod | null, Error>({
    queryKey: ['authMedthod'],
    queryFn: async (): Promise<AuthMethod | null > => {
      const startTime = Date.now();
      console.log('1a: start authMethod query')

      const isRedirect = isSignInRedirect(redirectUri);
      setIsOAuthRedirect(isRedirect);
      if (!isRedirect) return null;

      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') return null;

      try {
        const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
        const result = providerName === 'google'
          ? await authenticateWithGoogle(redirectUri)
          : await authenticateWithDiscord(redirectUri);

        if (result) {
          setAuthMethod(result);
          console.log(`1b: authMedthod finish:`, (Date.now() - startTime) / 1000);

          return result;
        }
        return null;
      } catch (error) {
        setAuthError(error instanceof Error ? error : new Error('Unknown error during authentication'));
        throw error;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: litNodeClientReady && isSignInRedirect(redirectUri) && isSignInRedirect(redirectUri),
  });
};

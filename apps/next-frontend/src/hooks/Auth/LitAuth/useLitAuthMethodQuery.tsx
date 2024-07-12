import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { authMethodAtom, isOAuthRedirectAtom, authErrorAtom, litNodeClientReadyAtom} from '@/atoms/atoms';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useLitAuthMethodQuery = () => {
  const [authMethod, setAuthMethod] = useAtom(authMethodAtom);
  const setIsOAuthRedirect = useSetAtom(isOAuthRedirectAtom);
  const setAuthError = useSetAtom(authErrorAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);

return useQuery({
    queryKey: ['authMethod'],
    queryFn: async () => {
      const isRedirect = isSignInRedirect(redirectUri);
      setIsOAuthRedirect(isRedirect);

      if (!isRedirect) return null; // Don't proceed if it's not a redirect

      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') return null;

      const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
      const result = providerName === 'google'
        ? await authenticateWithGoogle(redirectUri)
        : await authenticateWithDiscord(redirectUri);

      if (result) {
        setAuthMethod(result);
        return result;
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: litNodeClientReady && isSignInRedirect(redirectUri),
    retry: false,
  });
};

import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { authMethodAtom, isOAuthRedirectAtom, authErrorAtom } from '@/atoms/atoms';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { useLitNodeClientReadyQuery } from './useLitNodeClientReadyQuery';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useLitAuthMethodQuery = () => {
  const setAuthMethod = useSetAtom(authMethodAtom);
  const setIsOAuthRedirect = useSetAtom(isOAuthRedirectAtom);
  const setAuthError = useSetAtom(authErrorAtom);
  const{data: litNodeClientReady, isSuccess: isLitNodeClientReadySuccess } =  useLitNodeClientReadyQuery();
  return useQuery({
    queryKey: ['authMethod', isLitNodeClientReadySuccess ],
    queryFn: async () => {
      const isRedirect = isSignInRedirect(redirectUri);
      setIsOAuthRedirect(isRedirect);

      if (!isRedirect) return null; // Don't proceed if it's not a redirect

      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') return ;

      const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
      const result = providerName === 'google'
        ? await authenticateWithGoogle(redirectUri)
        : await authenticateWithDiscord(redirectUri);

      if (result) {
        setIsOAuthRedirect(false);
        setAuthMethod(result);
        return result;
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: litNodeClientReady && isLitNodeClientReadySuccess && isSignInRedirect(redirectUri),
    retry: false,
  });
};

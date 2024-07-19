import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { isOAuthRedirectAtom } from '@/atoms/atoms';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

interface LitAuthMethodQueryParams {
  queryKey: [string];
  enabledDeps: boolean
};

export const useLitAuthMethodQuery = ({
  queryKey,
  enabledDeps
}: LitAuthMethodQueryParams) => {
  const setIsOAuthRedirect = useSetAtom(isOAuthRedirectAtom);
  return useQuery({
    queryKey,
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
        return result;
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: enabledDeps,
    retry: false,
  });
};

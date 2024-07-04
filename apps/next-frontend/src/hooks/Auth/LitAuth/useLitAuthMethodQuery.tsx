import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { authMethodAtom, isOAuthRedirectAtom, authErrorAtom, litNodeClientReadyAtom} from '@/atoms/atoms';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useLitAuthMethodQuery = () => {
  const queryClient = useQueryClient();
  const setAuthMethod = useSetAtom(authMethodAtom);
  const setIsOAuthRedirect = useSetAtom(isOAuthRedirectAtom);
  const setAuthError = useSetAtom(authErrorAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);

  const query = useQuery({
    queryKey: ['authMethod'],
    queryFn: async () => {
      const startTime = Date.now();
      console.log('1a: start authMethod query');
      const isRedirect = isSignInRedirect(redirectUri);
      setIsOAuthRedirect(isRedirect);

      if (!isRedirect) {
        const persistedAuthMethod = localStorage.getItem('authMethod');
        if (persistedAuthMethod) {
          try {
            const parsedAuthMethod = JSON.parse(persistedAuthMethod);
            setAuthMethod(parsedAuthMethod);
            return parsedAuthMethod;
          } catch {
            localStorage.removeItem('authMethod');
          }
        }
        return null;
      }

      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') return null;

      const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
      const result = providerName === 'google'
        ? await authenticateWithGoogle(redirectUri)
        : await authenticateWithDiscord(redirectUri);

      if (result) {
        setAuthMethod(result);
        localStorage.setItem('authMethod', JSON.stringify(result));
        console.log(`1b: authMethod finish:`, (Date.now() - startTime) / 1000);
        return result;
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: litNodeClientReady && isSignInRedirect(redirectUri),
    retry: false, // Prevent retrying on error
  });

  // Handle success and error states
  if (query.isSuccess && query.data) {
    setAuthMethod(query.data);
  }

  if (query.isError) {
    setAuthError(query.error instanceof Error ? query.error : new Error('Unknown error during authentication'));
    localStorage.removeItem('authMethod');
    queryClient.setQueryData(['authMethod'], null);
  }

  return query;
};

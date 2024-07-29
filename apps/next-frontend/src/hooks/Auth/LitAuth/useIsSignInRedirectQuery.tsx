//useIsSignInRedirectQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { AuthTokens } from '@/types/types';
import { useRouter } from 'next/router';

interface IsSignInRedirectParams {
  queryKey?: [string];
  enabledDeps?: boolean;
}
const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useIsSignInRedirectQuery = (params?: IsSignInRedirectParams) => {
  const router = useRouter();
  const {
    queryKey = ['isSignInRedirect'],
    enabledDeps = true,
  } = params || {};

  return useQuery<AuthTokens | null>({
    queryKey,
    queryFn: async (): Promise<AuthTokens | null> => {
      console.log("1a: start isSignInRedirect query");
      console.log("Redirect URI:", redirectUri);
      console.log("Current URL:", window.location.href);
      console.log("Hash:", window.location.hash);

      // Check if we have tokens in the hash
      const hasTokens = window.location.hash.includes('access_token') && window.location.hash.includes('id_token');
      console.log("Has tokens in hash:", hasTokens);

      if (hasTokens) {
        const tokens = extractTokensFromHash(window.location.hash);
        console.log("Extracted tokens:", tokens);

        if (tokens) {
          // Clear the hash from the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          console.log("1b: finish isSignInRedirect query - Tokens extracted");
          return tokens;
        }
      }

      console.log("1b: finish isSignInRedirect query - No redirect detected");
      return null;
    },
    enabled: router.isReady && enabledDeps,
    staleTime: Infinity,
    gcTime: 0,
  });
};

function extractTokensFromHash(hash: string): AuthTokens | null {
  const params = new URLSearchParams(hash.substring(1));

  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');

  if (!idToken || !accessToken) {
    return null;
  }

  return { idToken, accessToken, provider: 'google' };
}

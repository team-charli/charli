//useIsSignInRedirectQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { AuthTokens } from '@/types/types';
import { useRouter } from 'next/router';
import ky from 'ky';
import { authChainLogger } from '@/pages/_app';

interface IsSignInRedirectParams {
  queryKey?: [string];
  enabledDeps?: boolean;
}

export const useIsSignInRedirectQuery = (params?: IsSignInRedirectParams) => {
  const router = useRouter();
  const { queryKey = ['isSignInRedirect'], enabledDeps = true } = params || {};

  return useQuery<AuthTokens | null>({
    queryKey,
    queryFn: async (): Promise<AuthTokens | null> => {
      // authChainLogger.info("1a: start isSignInRedirect query");

      // Check if we have tokens in the hash
      const hasTokens = window.location.hash.includes('access_token') && window.location.hash.includes('id_token');
      if (hasTokens) {
        const tokens = extractTokensFromHash(window.location.hash);
        if (tokens) {
          authChainLogger.info("1b: finish isSignInRedirect query - Tokens extracted");
          return tokens;
        }
      }
      authChainLogger.info("1b: finish isSignInRedirect query - No redirect detected");
      return null; // This will still be a "success" state, just with null data
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


  if (!idToken || !accessToken ) {
    return null;
  }

  return { idToken, accessToken, provider: 'googleJwt' };
}

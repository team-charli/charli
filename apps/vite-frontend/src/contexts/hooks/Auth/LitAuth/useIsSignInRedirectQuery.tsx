//useIsSignInRedirectQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { AuthData } from '@/types/types';
import { authChainLogger } from '@/App';

interface IsSignInRedirectParams {
  queryKey?: [string];
  enabledDeps?: boolean;
}

export const useIsSignInRedirectQuery = (params?: IsSignInRedirectParams) => {
  const { queryKey = ['signInRedirect'], enabledDeps = true } = params || {};

  return useQuery<AuthData | null>({
    queryKey,
    queryFn: async (): Promise<AuthData | null> => {
      // authChainLogger.info("1a: start isSignInRedirect query");

      // Check if we have tokens in the hash
      const hasTokens = window.location.hash.includes('access_token') && window.location.hash.includes('id_token');
      if (hasTokens) {
        const authData = extractTokensFromHash(window.location.hash);
        //console.log('window.location.hash', window.location.hash)
        if (authData) {
          authChainLogger.info("1b: finish isSignInRedirect query - Tokens extracted");
          return authData;
        }
      }
      authChainLogger.info("1b: finish isSignInRedirect query - No redirect detected");
      return null; // This will still be a "success" state, just with null data
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: 0,
  });
};

function extractTokensFromHash(hash: string): AuthData | null {
  const params = new URLSearchParams(hash.substring(1));

  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');


  if (!idToken || !accessToken) {
    return null;
  }

  return { idToken, provider: 'googleJwt', accessToken };
}

//useIsSignInRedirectQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { UnifiedAuth } from '@/types/types';
import { authChainLogger } from '@/App';

interface IsSignInRedirectParams {
  queryKey?: [string];
  enabledDeps?: boolean;
}

export const useIsSignInRedirectQuery = (params?: IsSignInRedirectParams) => {
  const { queryKey = ['signInRedirect'], enabledDeps = true } = params || {};

  return useQuery<UnifiedAuth | null>({
    queryKey,
    queryFn: async (): Promise<UnifiedAuth | null> => {
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

function extractTokensFromHash(hash: string): UnifiedAuth | null {
  const params = new URLSearchParams(hash.substring(1));
  const idToken = params.get('id_token') || null;
  const oauthAccessToken = params.get('access_token') || null;


  if (!idToken || !oauthAccessToken) {
    return null;
  }

 return {
    provider: 'googleJwt',
    idToken,
    oauthAccessToken,
    litAccessToken: idToken,
    authMethodType: 6,
  };
}

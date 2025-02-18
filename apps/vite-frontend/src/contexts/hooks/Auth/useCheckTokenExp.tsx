//useCheckTokenExp.tsx
import { useQuery } from '@tanstack/react-query';
import { isTokenExpired, handledExpiredTokens } from '@/utils/app';
import { queryClient } from '@/App';
import { UnifiedAuth } from '@/types/types';

export function useCheckTokenExp(unifiedAuth: UnifiedAuth | null | undefined) {
  return useQuery<boolean, Error>({
    queryKey: ['frontOfChainTokenCheck'],
    enabled: !!unifiedAuth,
    queryFn: async () => {
      if (!unifiedAuth) return false;

      // If provider=google, we parse the real ID token:
      // If it’s discord, we might skip or do something else.
      const { provider, idToken } = unifiedAuth;

      if (provider === 'googleJwt') {
        if (!idToken) {
          return false; // no token => treat as expired
        }
        if (isTokenExpired(idToken)) {
          handledExpiredTokens(queryClient);
          throw new Error("Token is stale. Signed out.");
        }
      }

      // If not google, handle other logic or skip
      return true;
    },
    staleTime: Infinity,
    retry: false,
  });
}


import { useQuery } from '@tanstack/react-query';
import { isTokenExpired, handledExpiredTokens } from '@/utils/app';
import { queryClient } from '@/App';
import { AuthData } from "@/types/types";

export function useCheckTokenExp(persistedAuthData: AuthData | null | undefined) {
  return useQuery<boolean, Error>({
    queryKey: ['frontOfChainTokenCheck'],
    enabled: !!persistedAuthData,  // Only run if we actually have some token data
    queryFn: async () => {
      if (!persistedAuthData) {
        // No token => not an error, just "no token" (return false or something)
        return false;
      }
      // If we do have a token, see if it's expired:
      if (isTokenExpired({
        authMethodType: 6,  // or figure it out from persistedAuthData
        idToken: persistedAuthData.idToken,
        accessToken: persistedAuthData.accessToken
      })) {
        handledExpiredTokens(queryClient);
        // throw an error so this query is isError=true
        throw new Error("Front-of-chain: token is stale. Signed out.");
      }
      // Not expired => return true meaning "token is valid"
      return true;
    },
    staleTime: Infinity,
    retry: false,
  });
}


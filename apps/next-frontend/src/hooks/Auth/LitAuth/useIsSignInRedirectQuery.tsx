//useIsSignInRedirectQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { AuthTokens } from '@/types/types';
import { useRouter } from 'next/router';
import ky from 'ky';

interface IsSignInRedirectParams {
  queryKey?: [string];
  enabledDeps?: boolean;
}
const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useIsSignInRedirectQuery = (params?: IsSignInRedirectParams) => {
  const router = useRouter();
  const { queryKey = ['isSignInRedirect'], enabledDeps = true } = params || {};

  return useQuery<AuthTokens | null>({
    queryKey,
    queryFn: async (): Promise<AuthTokens | null> => {
      console.log("1a: start isSignInRedirect query");

      // Check if we have tokens in the hash
      const hasTokens = window.location.hash.includes('access_token') && window.location.hash.includes('id_token');

      if (hasTokens) {
        // console.log('window.location.hash', JSON.stringify(window.location.hash))

        const tokens = extractTokensFromHash(window.location.hash);
        // console.log("Extracted tokens:", tokens);

        if (tokens) {
          // Clear the hash from the URL
          const {idToken, accessToken} = tokens;

          // const validateIdTokenResponse = await ky.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${idToken}`)
          const validateAccessTokenResponse = await ky.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`)
          const responseData = await validateAccessTokenResponse.json();
          console.log('Response Data:', responseData);

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


  if (!idToken || !accessToken ) {
    return null;
  }

  return { idToken, accessToken, provider: 'google' };
}

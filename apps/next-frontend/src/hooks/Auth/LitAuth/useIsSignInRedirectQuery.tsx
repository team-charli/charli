//useIsSignInRedirectQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { isSignInRedirect } from "@lit-protocol/lit-auth-client";
import { NextRouter, useRouter } from 'next/router';
import { AuthTokens } from '@/types/types';


function extractTokensFromUrl(url: string): AuthTokens | null {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);

  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');
  const provider = params.get('provider');

  if (!idToken || !accessToken || !provider) {
    return null;
  }

  return {
    idToken,
    accessToken,
    provider,
  };
}

interface IsSignInRedirectParams {
  queryKey?: [string];
  enabledDeps?: boolean;
  queryFnData?: [string];
}

export const useIsSignInRedirectQuery = (params?: IsSignInRedirectParams) => {
  const router = useRouter();
  const {
    queryKey = ['isSignInRedirect'],
    enabledDeps = true,
    queryFnData = ['']
  } = params || {};

  return useQuery<AuthTokens | null>({
    queryKey: ['isSignInRedirect', router.asPath],
    queryFn: async (): Promise<AuthTokens | null> => {
      const [redirectUri] = queryFnData;
      console.log("1a: start isSignInRedirect query");
      const isRedirect = isSignInRedirect(redirectUri);

      if (isRedirect) {
        const tokens = extractTokensFromUrl(window.location.href);
        if (tokens) {
          // Clear the tokens from the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        console.log("1b: finish isSignInRedirect query - Tokens extracted");
        return tokens;
      }

      console.log("1b: finish isSignInRedirect query - No redirect detected");
      return null;
    },
    enabled: router.isReady && enabledDeps,
    staleTime: Infinity,  // The result won't change during the lifetime of a page
    gcTime: 0,  // Don't cache between page loads
  });
};

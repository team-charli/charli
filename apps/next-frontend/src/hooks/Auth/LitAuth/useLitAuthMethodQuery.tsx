import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod } from '@lit-protocol/types';
import { getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

interface LitAuthMethodQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [boolean | undefined];
}

export const useOAuthRedirectAuthMethodQuery = (isSignInRedirect: boolean | undefined) => {
  return useQuery<AuthMethod | null, Error>({
    queryKey: ['oAuthRedirectAuthMethod'],
    queryFn: async (): Promise<AuthMethod | null> => {
      console.log("2a: start oAuthRedirectAuthMethod query");
      if (!isSignInRedirect) {
        console.log("2b: finish oAuthRedirectAuthMethod query - Not a redirect");
        return null;
      }
      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') {
        console.log("2b: finish oAuthRedirectAuthMethod query - No valid provider");
        return null;
      }
      try {
        const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
        const result = providerName === 'google'
          ? await authenticateWithGoogle(redirectUri)
          : await authenticateWithDiscord(redirectUri);
        if (result) {
          console.log("2b: finish oAuthRedirectAuthMethod query - New AuthMethod obtained");
          return result;
        }
        console.log("2b: finish oAuthRedirectAuthMethod query - Authentication failed");
        return null;
      } catch (error) {
        console.error('Error in oAuthRedirectAuthMethod query:', error);
        throw error;
      }
    },
    enabled: isSignInRedirect === true,
    staleTime: Infinity,
    gcTime: 0,
  });
};

export const useLitAuthMethodQuery = ({ queryKey, enabledDeps, queryFnData }: LitAuthMethodQueryParams): UseQueryResult<AuthMethod | null, Error> => {
  const queryClient = useQueryClient();
  const [isSignInRedirect] = queryFnData;
  const oAuthRedirectQuery = useOAuthRedirectAuthMethodQuery(isSignInRedirect);

  return useQuery<AuthMethod | null, Error>({
    queryKey,
    queryFn: async (): Promise<AuthMethod | null> => {
      console.log("2a: start authMethod query");

      if (oAuthRedirectQuery.data) {
        console.log("2b: finish authMethod query - Using AuthMethod from OAuth redirect");
        return oAuthRedirectQuery.data;
      }

      // Check for cached AuthMethod
      const cachedAuthMethod = queryClient.getQueryData(queryKey) as AuthMethod | null;
      if (cachedAuthMethod) {
        console.log("2b: finish authMethod query - Using cached AuthMethod");
        return cachedAuthMethod;
      }

      console.log('2b: finish authMethod query - No AuthMethod available');
      return null;
    },
    enabled: enabledDeps && oAuthRedirectQuery.isSuccess,
    staleTime: 5 * 60 * 1000 * 5,
    gcTime: Infinity,
    retry: false,
  });
};

import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod } from '@lit-protocol/types';
import { getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

interface LitAuthMethodQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [boolean | undefined];
}

export const useLitAuthMethodQuery = ({ queryKey, enabledDeps, queryFnData }: LitAuthMethodQueryParams): UseQueryResult<AuthMethod | null, Error> => {
  const queryClient = useQueryClient();

  return useQuery<AuthMethod | null, Error>({
    queryKey,
    queryFn: async (): Promise<AuthMethod | null> => {
      console.log("2a: start authMethod query");
      const [isSignInRedirect] = queryFnData;
      console.log('isSignInRedirect', isSignInRedirect)
      const cachedAuthMethod = queryClient.getQueryData(queryKey) as AuthMethod | null;

      if (isSignInRedirect) {
        const providerName = getProviderFromUrl();
        if (providerName !== 'google' && providerName !== 'discord') {
          console.log("2b: finish authMethod query - No valid provider");
          return null;
        }

        try {
          const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
          const result = providerName === 'google'
            ? await authenticateWithGoogle(redirectUri)
            : await authenticateWithDiscord(redirectUri);

          if (result) {
            console.log("2b: finish authMethod query - New AuthMethod obtained");
            return result;
          }

          console.log("2b: finish authMethod query - Authentication failed");
          return null;
        } catch (error) {
          console.error('Error in AuthMethod query:', error);
          throw error;
        }
      } else if (cachedAuthMethod) {
        console.log("2b: finish authMethod query -- Using cached AuthMethod");
        return cachedAuthMethod;
      }

      console.log('2b: finish authMethod query')

      return null;
    },
    staleTime:  5 * 60 * 1000 * 5,
    gcTime: 24 * 60 * 60 * 1000, // Keep unused data for 24 hours
    enabled: enabledDeps,
    retry: false,
  });
};

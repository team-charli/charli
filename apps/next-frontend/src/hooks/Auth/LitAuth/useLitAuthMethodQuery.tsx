import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod } from '@lit-protocol/types';
import { AuthTokens } from '@/types/types';
import { litAuthClient } from '@/utils/litClients';
import { GoogleProvider } from '@lit-protocol/lit-auth-client';
import { ProviderType } from '@lit-protocol/constants';

interface LitAuthMethodQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [AuthTokens | null | undefined];
}

export const useLitAuthMethodQuery = ({ queryKey, enabledDeps, queryFnData }: LitAuthMethodQueryParams): UseQueryResult<AuthMethod | null, Error> => {
  const queryClient = useQueryClient();
  const [authTokens] = queryFnData;
  return useQuery<AuthMethod | null, Error>({
    queryKey,
    queryFn: async (): Promise<AuthMethod | null> => {
      console.log("2a: start authMethod query");

      if (authTokens) {
        console.log("2b: finish authMethod query - Using AuthMethod from OAuth redirect");
        const {provider, idToken, accessToken} = authTokens;
        let authMethodType
        if (provider === 'googleJwt'){
          authMethodType = 6
        } else if (provider === 'discord') {
          authMethodType = 4
        } else {
          throw new Error('unknown provider type')
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        const authMethod:AuthMethod = {authMethodType, accessToken: idToken }
        if (Object.values(authMethod).every(value => value !== undefined)){
          if (authMethod.authMethodType === 6 ) {
           litAuthClient.initProvider<GoogleProvider>(
            ProviderType.Google
          );
          }

          return authMethod;
        } else {
          console.log(authMethod);
          throw new Error('authMethod values undefined')
        }
      }

      // Check for cached AuthMethod
      const cachedAuthMethod = queryClient.getQueryData(queryKey) as AuthMethod | null;
      if (cachedAuthMethod) {
        console.log("2b: finish authMethod query - Using cached AuthMethod");
        return cachedAuthMethod;
      }

      // console.log('2b: finish authMethod query - No AuthMethod available');
      return null;
    },
    enabled: enabledDeps /*&& oAuthRedirectQuery.isSuccess*/,
    staleTime: 5 * 60 * 1000 * 5,
    gcTime: Infinity,
    retry: false,
  });
};




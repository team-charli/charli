//useLitAuthMethodQuery.tsx
import { router } from '@/TanstackRouter/router';
import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthData, AuthMethodPlus} from '@/types/types';
import { litAuthClient } from '@/utils/litClients';
import { GoogleProvider } from '@lit-protocol/lit-auth-client';
import { ProviderType } from '@lit-protocol/constants';
import { authChainLogger  } from '@/App';
import { isTokenExpired } from '@/utils/app';

interface LitAuthMethodQueryParams {
  queryKey: [string, /*AuthTokens | undefined | null*/];
  enabledDeps: boolean;
  queryFnData: [AuthData | null | undefined];
  persister: any;
}

export const useLitAuthMethodQuery = ({ queryKey, enabledDeps, queryFnData, persister }: LitAuthMethodQueryParams): UseQueryResult<AuthMethodPlus | null, Error> => {
  const queryClient = useQueryClient();
  const [authData] = queryFnData;

  return useQuery<AuthMethodPlus | null, Error>({
    queryKey,
    queryFn: async (): Promise<AuthMethodPlus | null> => {
      authChainLogger.info("2a: start authMethod query");

      // Check cached AuthMethod
      const cachedAuthMethod = queryClient.getQueryData(queryKey) as AuthMethodPlus | null;
      if (cachedAuthMethod) {
        if (!isTokenExpired(cachedAuthMethod)) {
          authChainLogger.info("2b: finish authMethod query - Using valid cached AuthMethod");
          return cachedAuthMethod;
        } else {
          console.log("Cached AuthMethod contains expired tokens");

          // Clear local storage
          localStorage.clear();

          // Clear entire Tanstack Query cache
          queryClient.clear();

          // Redirect to login
          router.navigate({ to: '/login' });

          // Throw an error to prevent further execution
          throw new Error('AuthMethod expired, cache cleared and redirected');
        }
      }

      // Handle fresh AuthData
      if (authData) {
        authChainLogger.info("2b: finish authMethod query - Using fresh AuthMethod from OAuth redirect");
        const { provider, idToken, accessToken } = authData;

        let authMethodType;
        if (provider === 'googleJwt') {
          authMethodType = 6;
        } else if (provider === 'discord') {
          authMethodType = 4;
        } else {
          throw new Error('unknown provider type');
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        const authMethod: AuthMethodPlus = { authMethodType, idToken, accessToken };

        if (Object.values(authMethod).every(value => value !== undefined)) {
          if (authMethod.authMethodType === 6) {
            litAuthClient.initProvider<GoogleProvider>(ProviderType.Google);
          }
          authChainLogger.info('2b: finish authMethod query - new AuthMethod from query params');
          return authMethod;
        } else {
          authChainLogger.info(authMethod);
          throw new Error('authMethod values undefined');
        }
      }

      authChainLogger.info('2b: finish authMethod query - No valid AuthMethod available');
      return null;
    },
    enabled: enabledDeps,
    staleTime: 0,
    gcTime: Infinity,
    retry: false,
    persister,
  });
};

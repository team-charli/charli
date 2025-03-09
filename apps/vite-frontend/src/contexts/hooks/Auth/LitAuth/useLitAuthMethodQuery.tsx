//useLitAuthMethodQuery.tsx
import { router } from '@/TanstackRouter/router';
import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { litAuthClient } from '@/utils/litClients';
import { DiscordProvider, GoogleProvider } from '@lit-protocol/lit-auth-client';
import { ProviderType } from '@lit-protocol/constants';
import { authChainLogger  } from '@/App';
import { isTokenExpired } from '@/utils/app';
import { UnifiedAuth } from '@/types/types';

interface LitAuthMethodQueryParams {
  queryKey: [string, /*AuthTokens | undefined | null*/];
  enabledDeps: boolean;
  queryFnData: [UnifiedAuth | null | undefined];
  persister: any;
}

export const useLitAuthMethodQuery = ({ queryKey, enabledDeps, queryFnData, persister }: LitAuthMethodQueryParams): UseQueryResult<UnifiedAuth | null, Error> => {
  const queryClient = useQueryClient();
  const [authData] = queryFnData;

  return useQuery<UnifiedAuth | null, Error>({
    queryKey,
    queryFn: async (): Promise<UnifiedAuth | null> => {
      authChainLogger.info("2a: start authMethod query");

      // Check cached AuthMethod
      const cachedAuthMethod = queryClient.getQueryData(queryKey) as UnifiedAuth | null;
      if (cachedAuthMethod?.idToken) {
        if (!isTokenExpired(cachedAuthMethod.idToken)) {
          authChainLogger.info("2b: finish authMethod query - Using valid cached AuthMethod");
          // If the cached authMethod is GoogleJwt or Discord, re-init the provider
          if (cachedAuthMethod.provider === 'googleJwt') {
            litAuthClient.initProvider<GoogleProvider>(ProviderType.Google);
          } else if (cachedAuthMethod.provider === 'discord') {
            litAuthClient.initProvider<DiscordProvider>(ProviderType.Discord);
          }
          return cachedAuthMethod;
        } else {
          console.log("Cached AuthMethod contains expired tokens");
          console.log('will redirect to login');

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
        const { provider, idToken, oauthAccessToken } = authData;

        let authMethodType;
        if (provider === 'googleJwt') {
          authMethodType = 6;
        } else if (provider === 'discord') {
          authMethodType = 4;
        } else {
          throw new Error('unknown provider type');
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        const authMethod: UnifiedAuth = { authMethodType, idToken, oauthAccessToken, provider, litAccessToken: idToken  };

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

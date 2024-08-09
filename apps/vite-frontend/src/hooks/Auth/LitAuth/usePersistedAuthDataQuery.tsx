import { useQuery } from "@tanstack/react-query";
import { UseQueryResult } from '@tanstack/react-query';
import { AuthData } from "@/types/types";

export const usePersistedAuthDataQuery = (): UseQueryResult<AuthData | null, Error> => {
  return useQuery({
    queryKey: ['persistedAuthData'],
    queryFn: async () => {
      const authMethodKey = 'tanstack-query-["authMethod"]';
      const persistedAuthMethod = localStorage.getItem(authMethodKey);

      if (persistedAuthMethod) {
        try {
          const parsedAuthMethod = JSON.parse(persistedAuthMethod);
          if (parsedAuthMethod.state && parsedAuthMethod.state.data) {
            // The data we need is already in the correct format
            const { authMethodType, accessToken } = parsedAuthMethod.state.data;

            if (authMethodType && accessToken) {
              if (authMethodType === 6) {
                return { provider: "googleJwt", idToken: accessToken };
              }
            } else {
              console.error('Missing authMethodType or accessToken in persisted data', parsedAuthMethod.state.data);
            }
          } else {
            console.error('Unexpected structure in persisted data', parsedAuthMethod);
          }
        } catch (error) {
          console.error('Error parsing persisted auth method:', error);
        }
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

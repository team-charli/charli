// usePersistedAuthDataQuery.tsx
import { UnifiedAuth } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { UseQueryResult } from '@tanstack/react-query';

export const usePersistedAuthDataQuery = (): UseQueryResult<UnifiedAuth | null, Error> => {
  return useQuery<UnifiedAuth | null, Error>({
    queryKey: ['persistedAuthData'],
    queryFn: async () => {
      const authMethodKey = 'tanstack-query-["authMethod"]';
      const raw = localStorage.getItem(authMethodKey);

      if (!raw) {
        // No stored “authMethod” => no persisted data
        return null;
      }

      try {
        const parsed = JSON.parse(raw);

        // Typically, “parsed.state.data” holds your actual object
        // that we returned from the “authMethod” query
        const maybeUnified = parsed?.state?.data;
        if (!maybeUnified) {
          console.error('Unexpected structure in persisted data', parsed);
          return null;
        }

        // The object should match your “UnifiedAuth” shape:
        // { authMethodType, provider, idToken, oauthAccessToken, litAccessToken }
        const {
          authMethodType,
          provider,
          idToken,
          oauthAccessToken,
          litAccessToken,
        } = maybeUnified;

        // Basic checks to confirm all fields are present:
        if (
          typeof authMethodType === 'number' &&
          typeof provider === 'string' &&
          typeof idToken === 'string' &&
          typeof litAccessToken === 'string'
        ) {
          // If everything looks good, return it as a “UnifiedAuth”
          return {
            authMethodType,
            provider,
            idToken,
            oauthAccessToken: oauthAccessToken ?? null,
            litAccessToken,
          };
        } else {
          console.error(
            'Missing or invalid fields in persisted data',
            maybeUnified
          );
        }
      } catch (error) {
        console.error('Error parsing persisted auth method:', error);
      }

      return null; // If anything was missing or invalid, fall back to null
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

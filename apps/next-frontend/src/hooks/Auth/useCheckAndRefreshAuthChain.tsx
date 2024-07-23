// refreshAuthChain.tsx
import { isJwtExpired, sessionSigsExpired } from "@/utils/app";
import { SessionSigs } from "@lit-protocol/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvalidateAuthQueries } from './useInvalidateAuthQueries';
import { useAuth } from '@/contexts/AuthContext';

export function useCheckAndRefreshAuthChain() {
  const queryClient = useQueryClient();
  const invalidateQueries = useInvalidateAuthQueries();
  const auth = useAuth();

  return useQuery({
    queryKey: ['checkAndRefreshAuthChain'],
    queryFn: async () => {
      const querySequence = ['litNodeClient', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn', 'pkpWallet', 'nonce', 'signature', 'supabaseJWT', 'supabaseClient', 'isOnboarded'];

      for (const queryName of querySequence) {
        const queryData = queryClient.getQueryData([queryName]);

        if (!queryData) {
          if (queryName === 'authMethod' || queryName === 'sessionSigs') {
            console.log(`${queryName} missing, OAuth login required`);
            return { status: 'incomplete', missingStep: queryName, requiresOAuth: true };
          }

          // For other queries, attempt to refetch
          await queryClient.refetchQueries({ queryKey: [queryName] });
          const refetchedData = queryClient.getQueryData([queryName]);

          if (!refetchedData) {
            return { status: 'incomplete', missingStep: queryName };
          }
        }
        else if (queryName === 'sessionSigs' && sessionSigsExpired(queryData as SessionSigs)) {
          console.log('Session sigs expired, OAuth login required');
          await invalidateQueries();
          return { status: 'incomplete', missingStep: queryName, requiresOAuth: true };
        }
        else if (queryName === 'supabaseJWT' && isJwtExpired(queryData as string)) {
          console.log('JWT expired or missing');
          const sessionSigs = queryClient.getQueryData(['sessionSigs']) as SessionSigs | undefined;

          if (!sessionSigs || sessionSigsExpired(sessionSigs)) {
            console.log('Session sigs also expired or missing, OAuth login required');
            await invalidateQueries();
            return { status: 'incomplete', missingStep: queryName, requiresOAuth: true };
          } else {
            console.log('Session sigs valid, refreshing from nonce onwards');
            for (const refreshQuery of ['nonce', 'signature', 'supabaseJWT', 'supabaseClient']) {
              await queryClient.refetchQueries({ queryKey: [refreshQuery] });
            }
            // Check if supabaseJWT was successfully refreshed
            const newJwt = queryClient.getQueryData(['supabaseJWT']);
            if (!newJwt) {
              return { status: 'incomplete', missingStep: 'supabaseJWT' };
            }
          }
        }
      }

      return { status: 'complete' };
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    enabled: auth.isSuccess && !auth.isLoading, // Only enable when useAuthChain is complete
  });
}

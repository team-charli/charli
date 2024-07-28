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
      const querySequence = ['litNodeClient', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn', 'pkpWallet', 'supabaseClient', 'isOnboarded'];

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
      }

      return { status: 'complete' };
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: auth.isSuccess && !auth.isLoading,
  });
}

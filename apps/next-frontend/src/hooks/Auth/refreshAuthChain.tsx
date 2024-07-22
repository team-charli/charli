// refreshAuthChain.tsx
import { isJwtExpired, sessionSigsExpired } from "@/utils/app";
import {  SessionSigs } from "@lit-protocol/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvalidateAuthQueries } from './useInvalidateAuthQueries';

export function useRefreshAuthChain() {
  const queryClient = useQueryClient();
  const invalidateQueries = useInvalidateAuthQueries();

  return useQuery({
    queryKey: ['refreshAuthChain'],
    queryFn: async () => {
      const querySequence = [ 'litNodeClient', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn', 'pkpWallet', 'nonce', 'signature', 'supabaseJWT', 'supabaseClient', 'isOnboarded' ];

      for (const queryName of querySequence) {
        const queryData = queryClient.getQueryData([queryName]);

        if (!queryData) {
          await queryClient.refetchQueries({ queryKey: [queryName] });
        }

        else if (queryName === 'sessionSigs' && sessionSigsExpired(queryData as SessionSigs)) {
          console.log('Session sigs expired');
          await invalidateQueries();
          return { status: 'incomplete', missingStep: queryName };
        }

        else if (queryName === 'supabaseJWT' && isJwtExpired(queryData as string)) {
          console.log('JWT expired or missing');
          await invalidateQueries();
          return { status: 'incomplete', missingStep: queryName };
        }

        const updatedData = queryClient.getQueryData([queryName]);
        if (!updatedData && ['litNodeClient', 'authMethod', 'litAccount', 'sessionSigs', 'isLitLoggedIn'].includes(queryName)) {
          return { status: 'incomplete', missingStep: queryName };
        }
      }

      return { status: 'complete' };
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
}

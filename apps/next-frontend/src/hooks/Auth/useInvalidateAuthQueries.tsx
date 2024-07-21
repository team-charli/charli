// hooks/Auth/useInvalidateAuthQueries.ts
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useInvalidateAuthQueries = () => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        'authMethod',
        'litAccount',
        'litSessionSigs',
        'pkpWallet',
        'nonce',
        'signature',
        'supabaseJWT',
        'supabaseClient'
      ]
    });
    return 'redirect_to_login';
  }, [queryClient]);
};

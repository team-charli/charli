import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { sessionSigsExpired, isJwtExpired } from '@/utils/app';
import { SessionSigs } from '@lit-protocol/types';

export const useAuthChainManager = () => {
  const queryClient = useQueryClient();

  const checkAndInvalidate = useCallback(async () => {
    const litNodeClientReady = queryClient.getQueryData(['litNodeClientReady'])
    const authMethod = queryClient.getQueryData(['authMethod']);
    const litAccount = queryClient.getQueryData(['litAccount']);
    const sessionSigs = queryClient.getQueryData(['litSessionSigs']) as SessionSigs | undefined;
    const pkpWallet = queryClient.getQueryData(['pkpWallet']);
    const jwt = queryClient.getQueryData(['supabaseJWT']) as string | undefined;

    if (!litNodeClientReady) {
      await queryClient.refetchQueries({ queryKey: ['litNodeClientReady'] });
      return 'continue';
    }
    if (!authMethod) {
      return 'redirect_to_login';
    }
    // if (!litAccount) {
    //   return 'redirect_to_login';
    // }
    if (!sessionSigs || sessionSigsExpired(sessionSigs)) {
      console.log('Session sigs expired');
      await invalidateQueries();
      return 'redirect_to_login';
    }
    if (!pkpWallet) {
      await queryClient.refetchQueries({ queryKey: ['pkpWallet'] });
      return 'continue';
    }
    if (!jwt || isJwtExpired(jwt)) {
      console.log('JWT expired or missing');
      return await invalidateQueries();
    }
    return 'continue';
  }, [queryClient]);

  const invalidateQueries = useCallback(async () => {
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

  return { checkAndInvalidate, invalidateQueries };
};

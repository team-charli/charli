import { useQueryClient } from '@tanstack/react-query';
import { useAtomValues } from './utils/useAtomValues';
import { sessionSigsExpired, isJwtExpired, checkAuthSigExpiration } from '@/utils/app';
import { useCallback } from 'react';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';

export const useAuthChainManager = () => {
  const queryClient = useQueryClient();
  const { authSig, sessionSigs, pkpWallet } = useAtomValues();

  const checkAndInvalidate = useCallback(async (
    litNodeClientReady: boolean | undefined,
    authMethod: AuthMethod | undefined | null ,
    litAccount: IRelayPKP | undefined | null,
    jwt: string | undefined | null
  ) => {
    if (!litNodeClientReady) {
      await queryClient.refetchQueries({ queryKey: ['litNodeClientReady'] });
      return 'continue';
    }

    if (!authMethod) {
      return 'redirect_to_login';
    }

    if (!litAccount) {
      return 'redirect_to_login';
    }

    if (!authSig || checkAuthSigExpiration(authSig)) {
      console.log('Auth sig expired or missing');
      await invalidateQueries();
      return 'redirect_to_login';
    }

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
  }, [queryClient, authSig, sessionSigs, pkpWallet]);

  const invalidateQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        'authMethod',
        'fetchLitAccounts',
        'litSession',
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

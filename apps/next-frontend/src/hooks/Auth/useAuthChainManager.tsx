import { useQueryClient } from '@tanstack/react-query';
import { useInitQueriesAtoms } from './utils/initQueriesAtoms';
import { sessionSigsExpired, isJwtExpired, getAuthSigFromLocalStorage, checkAuthSigExpiration } from '@/utils/app';

export const useAuthChainManager = () => {
  const queryClient = useQueryClient();
  const { jwt, authMethod, litAccount, authSig, sessionSigs, litNodeClientReady, pkpWallet, nonce, signature } = useInitQueriesAtoms()


  const checkAndInvalidate = async () => {
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

    if (!authSig || checkAuthSigExpiration(authSig) ) {
      await invalidateQueries()
      return 'redirect_to_login';
    }

    if (!sessionSigs || sessionSigsExpired(sessionSigs)) {
      await invalidateQueries()

      return 'redirect_to_login';
    }

    if (!pkpWallet) {
      await queryClient.refetchQueries({ queryKey: ['pkpWallet'] });
      return 'continue';
    }

    if (!jwt || isJwtExpired(jwt)) {
      return await invalidateQueries();
    }

    return 'continue';
  };

  return { checkAndInvalidate };

  async function invalidateQueries () {
      // Invalidate the entire auth chain
    console.log('invalidateQueries')
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

    // If authSig and sessionSigs are still valid, we can just refresh from nonce
    await queryClient.refetchQueries({
      queryKey: ['nonce', 'signature', 'supabaseJWT', 'supabaseClient']
    });

    return 'continue';
  };

};



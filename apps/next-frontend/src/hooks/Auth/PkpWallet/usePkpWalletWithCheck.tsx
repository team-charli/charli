import { useQuery, UseQueryOptions, QueryKey, QueryFunctionContext } from '@tanstack/react-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useCallback } from 'react';
import { usePkpWallet } from './usePkpWallet';
import { useAuthChainManager } from '../useAuthChainManager';
import { litAccountAtom, supabaseJWTAtom } from '@/atoms/atoms';
import { useAtomValue } from 'jotai';
import { useLitAuthMethodQuery } from '../LitAuth/useLitAuthMethodQuery';
import { useLitNodeClientReadyQuery } from '../LitAuth/useLitNodeClientReadyQuery';

export const usePkpWalletWithCheck = (
  queryKey: QueryKey,
  queryFn: (wallet: PKPEthersWallet | undefined, context: QueryFunctionContext<QueryKey>) => Promise<any>,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  const {data: litNodeClientReady} = useLitNodeClientReadyQuery();
  const {data: authMethod} = useLitAuthMethodQuery();
  const litAccount = useAtomValue(litAccountAtom);
  const jwt = useAtomValue(supabaseJWTAtom);

  const { checkAndInvalidate } = useAuthChainManager();
  const { data: pkpWallet, isSuccess: isPkpWalletSuccess } = usePkpWallet();

  const wrappedQueryFn = useCallback(async (context: QueryFunctionContext<QueryKey>) => {

    if (!isPkpWalletSuccess || !pkpWallet) {
      console.log('usePkpWalletWithCheck: PKP Wallet not ready, checking auth');
      const authResult = await checkAndInvalidate(litNodeClientReady, authMethod, litAccount, jwt);
      if (authResult === 'redirect_to_login') {
        console.log('usePkpWalletWithCheck: Authentication required');
      }
    }

    if (!pkpWallet) {
      console.log('usePkpWalletWithCheck: PKP Wallet still not available after auth check');
    }

    return await queryFn(pkpWallet, context);
  }, [queryFn, checkAndInvalidate, pkpWallet, isPkpWalletSuccess]);

  return useQuery({
    ...options,
    queryKey,
    queryFn: wrappedQueryFn,
    enabled: options?.enabled !== false && isPkpWalletSuccess,
  });
};

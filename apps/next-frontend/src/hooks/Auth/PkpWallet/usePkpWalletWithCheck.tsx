import { useQuery, useQueryClient, QueryKey, UseQueryOptions, QueryFunctionContext } from '@tanstack/react-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { usePkpWallet } from './usePkpWallet';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { sessionSigsAtom } from '@/atoms/atoms';
import { sessionSigsExpired } from '@/utils/app';

export const usePkpWalletWithCheck = <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: (wallet: PKPEthersWallet, context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
) => {
  const queryClient = useQueryClient();
  const { data: pkpWallet, isLoading: isPkpWalletLoading } = usePkpWallet();
  const sessionSigs = useAtomValue(sessionSigsAtom);

  const refreshWalletAndSigs = useCallback(async () => {
    await queryClient.invalidateQueries({queryKey: ['sessionSigs', 'pkpWallet']});
    await queryClient.refetchQueries({queryKey: ['sessionSigs', 'pkpWallet']});
    return queryClient.getQueryData(['pkpWallet']);
  }, [queryClient]);

  return useQuery({
    ...options,
    queryKey,
    queryFn: async (context: QueryFunctionContext<TQueryKey>) => {
      let wallet = pkpWallet;
      if (sessionSigsExpired(sessionSigs) || !wallet) {
        wallet = await refreshWalletAndSigs() as PKPEthersWallet | null;
        if (!wallet) {
          throw new Error('Failed to refresh PKP wallet');
        }
      }
      try {
        return await queryFn(wallet, context);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('session') || error.message.includes('EXP too large or wrong'))) {
          wallet = await refreshWalletAndSigs() as PKPEthersWallet | null;
          if (wallet) {
            return await queryFn(wallet, context);
          }
        }
        throw error;
      }
    },
    enabled: !isPkpWalletLoading && !!sessionSigs && !sessionSigsExpired(sessionSigs) && options?.enabled !== false,
    retry: (failureCount) => failureCount < 3,
  });
};

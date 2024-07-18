// import { UseQueryOptions, UseQueryResult, useQuery } from '@tanstack/react-query';
// import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

// export const createUsePkpWalletWithCheck = (pkpWalletQuery: UseQueryResult<PKPEthersWallet | null, Error>) => {
//   return <TData, TError>(
//     queryKey: any,
//     queryFn: (wallet: PKPEthersWallet | null) => Promise<TData>,
//     options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
//   ): UseQueryResult<TData, TError> => {
//     return useQuery({
//       queryKey,
//       queryFn: async () => {
//         if (!pkpWalletQuery.data) {
//           throw new Error('PKP Wallet not available');
//         }
//         return queryFn(pkpWalletQuery.data);
//       },
//       ...options,
//       enabled: options?.enabled !== false && !!pkpWalletQuery.data,
//     });
//   };
// };

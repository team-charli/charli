// import { QueryFunctionContext, QueryKey, UseQueryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
// import { SupabaseClient } from '@supabase/supabase-js';
// import { useCallback } from 'react';
// import { SupabaseError } from '@/types/types';
// import { AuthMethod, IRelayPKP } from '@lit-protocol/types';

// interface SupabaseQueryParams {
//   litNodeClientReady: boolean | undefined;
//   authMethod: AuthMethod | null | undefined;
//   litAccount: IRelayPKP | null | undefined;
//   jwt: string | null | undefined;
//   supabaseClient: SupabaseClient | null | undefined;
//   checkAndInvalidate: (
//     litNodeClientReady: boolean | undefined,
//     authMethod: AuthMethod | null | undefined,
//     litAccount: IRelayPKP | null | undefined,
//     jwt: string | null | undefined
//   ) => Promise<string>
// }

// export const createUseSupabaseQuery = (params: SupabaseQueryParams) => {
//   return function useSupabaseQuery<
//     TQueryFnData = unknown,
//     TError = SupabaseError,
//     TData = TQueryFnData,
//     TQueryKey extends QueryKey = QueryKey
//   >(
//       queryKey: TQueryKey,
//       queryFn: (supabaseClient: SupabaseClient, context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>,
//       options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
//     ) {
//       const queryClient = useQueryClient();
//       const { litNodeClientReady, authMethod, litAccount, jwt, supabaseClient, checkAndInvalidate } = params;

//       const wrappedQueryFn = useCallback(async (context: QueryFunctionContext<TQueryKey>) => {
//         const checkAuth = async () => {
//           const result = await checkAndInvalidate(litNodeClientReady, authMethod, litAccount, jwt);
//           if (result === 'redirect_to_login') {
//             throw new Error('Authentication required');
//           }
//           // After checkAndInvalidate, we should have a fresh JWT and client if needed
//           const currentJWT = queryClient.getQueryData(['supabaseJWT']);
//           const currentClient = queryClient.getQueryData(['supabaseClient']);
//           if (!currentJWT || !currentClient) {
//             throw new Error('Failed to obtain valid authentication');
//           }
//           return currentClient as SupabaseClient;
//         };

//         try {
//           const client = await checkAuth();
//           return await queryFn(client, context);
//         } catch (error) {
//           if (error instanceof Error && (error.message.includes('JWT expired') || error.message.includes('Authentication required'))) {
//             // If JWT expired during query execution, check auth again and retry
//             const client = await checkAuth();
//             return await queryFn(client, context);
//           }
//           throw error;
//         }
//       }, [queryFn, jwt, supabaseClient, queryClient, checkAndInvalidate, litNodeClientReady, authMethod, litAccount]);

//       return useQuery({
//         ...options,
//         queryKey,
//         queryFn: wrappedQueryFn,
//         enabled: !!supabaseClient && options?.enabled !== false,
//         retry: (failureCount, error) => {
//           if (error instanceof Error && (error.message.includes('network') || error.message.includes('JWT expired'))) {
//             return failureCount < 3;
//           }
//           return false;
//         },
//       });
//     };
// };

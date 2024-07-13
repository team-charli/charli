import { QueryFunctionContext, QueryKey, UseQueryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseJWTAtom } from '@/atoms/atoms';
import { useAtomValue } from 'jotai';
import { SupabaseClient } from '@supabase/supabase-js';
import { useCallback } from 'react';
import { useSupabaseClient } from '../Auth';
import { useAuthChainManager } from '../Auth/useAuthChainManager';
import { SupabaseError } from '@/types/types';


export function useSupabaseQuery<
TQueryFnData = unknown,
TError = SupabaseError,
TData = TQueryFnData,
TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: (supabaseClient: SupabaseClient, context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
) {
  const queryClient = useQueryClient();
  const jwt = useAtomValue(supabaseJWTAtom);
  const { data: supabaseClient, isLoading: isClientLoading } = useSupabaseClient();
  const { checkAndInvalidate } = useAuthChainManager();

  const wrappedQueryFn = useCallback(async (context: QueryFunctionContext<TQueryKey>) => {
    const checkAuth = async () => {
      const result = await checkAndInvalidate();
      if (result === 'redirect_to_login') {
        throw new Error('Authentication required');
      }
      // After checkAndInvalidate, we should have a fresh JWT and client if needed
      const currentJWT = queryClient.getQueryData(['supabaseJWT']);
      const currentClient = queryClient.getQueryData(['supabaseClient']);

      if (!currentJWT || !currentClient) {
        throw new Error('Failed to obtain valid authentication');
      }

      return currentClient as SupabaseClient;
    };

    try {
      const client = await checkAuth();
      return await queryFn(client, context);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('JWT expired') || error.message.includes('Authentication required'))) {
        // If JWT expired during query execution, check auth again and retry
        const client = await checkAuth();
        return await queryFn(client, context);
      }
      throw error;
    }
  }, [queryFn, jwt, supabaseClient, queryClient, checkAndInvalidate]);

  return useQuery({
    ...options,
    queryKey,
    queryFn: wrappedQueryFn,
    enabled: !isClientLoading && !!supabaseClient && options?.enabled !== false,
    retry: (failureCount, error) => {
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('JWT expired'))) {
        return failureCount < 3;
      }
      return false;
    },
  });
}

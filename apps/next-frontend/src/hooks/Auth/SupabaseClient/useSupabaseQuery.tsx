//useSupabaseQuery.tsx
import { QueryKey, UseQueryOptions, useQuery, QueryFunction, QueryFunctionContext } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { supabaseJWTAtom, supabaseClientAtom } from '@/atoms/atoms';
import { useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { isJwtExpired } from '@/utils/app';
import { useSupabaseClient } from './useSupabaseClient';

const refreshAuthQueries = async (queryClient: any) => {
  await queryClient.refetchQueries({
    queryKey: ['nonce', 'signature', 'supabaseJWT', 'supabaseClient'],
  });
};

export function useSupabaseQuery<
  TQueryFnData = unknown,
  TError = unknown,
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
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const wrappedQueryFn = useCallback(async (context: QueryFunctionContext<TQueryKey>) => {
    if (!jwt || isJwtExpired(jwt)) {
      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = refreshAuthQueries(queryClient);
        queryClient.invalidateQueries({queryKey: ['supabaseClient']});
      }
      await refreshPromiseRef.current;
      refreshPromiseRef.current = null;
    }

    if (!supabaseClient) {
      throw new Error('No Supabase client available');
    }

    return queryFn(supabaseClient, context);
  }, [queryFn, jwt, supabaseClient, queryClient]);

  return useQuery({
    ...options,
    queryKey,
    queryFn: wrappedQueryFn,

    enabled: !isClientLoading && !!supabaseClient && options?.enabled !== false,
  });
}

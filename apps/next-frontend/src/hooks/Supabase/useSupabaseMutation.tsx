import { useMutation, UseMutationOptions, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { supabaseJWTAtom } from '@/atoms/atoms';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseClient } from '../Auth';
import { useAuthChainManager } from '../Auth/useAuthChainManager';

export function useSupabaseMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (supabaseClient: SupabaseClient, variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const jwt = useAtomValue(supabaseJWTAtom);
  const { data: supabaseClient, isLoading: isClientLoading } = useSupabaseClient();
  const { checkAndInvalidate } = useAuthChainManager();

  const wrappedMutationFn = async (variables: TVariables) => {
    const checkAuth = async () => {
      const result = await checkAndInvalidate();
      if (result === 'redirect_to_login') {
        throw new Error('Authentication required');
      }
      const currentJWT = queryClient.getQueryData(['supabaseJWT']);
      const currentClient = queryClient.getQueryData(['supabaseClient']);
      if (!currentJWT || !currentClient) {
        throw new Error('Failed to obtain valid authentication');
      }
      return currentClient as SupabaseClient;
    };

    try {
      const client = await checkAuth();
      return await mutationFn(client, variables);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('JWT expired') || error.message.includes('Authentication required'))) {
        // If JWT expired during mutation execution, check auth again and retry
        const client = await checkAuth();
        return await mutationFn(client, variables);
      }
      throw error;
    }
  };

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn: wrappedMutationFn,
    retry: (failureCount, error) => {
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('JWT expired'))) {
        return failureCount < 3;
      }
      return false;
    },
  });
}

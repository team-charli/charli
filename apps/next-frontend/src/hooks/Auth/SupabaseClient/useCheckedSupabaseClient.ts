import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { supabaseJWTAtom} from '@/atoms/atoms';
import { isJwtExpired } from '@/utils/app';
import { SupabaseClient } from '@supabase/supabase-js';
import { useAuthChainManager } from '../useAuthChainManager';
import { supabaseClientAtom } from '@/atoms/supabaseClientAtom';

export function useCheckedSupabaseClient(): () => Promise<SupabaseClient> {
  const queryClient = useQueryClient();
  const jwt = useAtomValue(supabaseJWTAtom);
  const supabaseClient = useAtomValue(supabaseClientAtom);
  const { checkAndInvalidate } = useAuthChainManager();

  return async (): Promise<SupabaseClient> => {
    if (!jwt || isJwtExpired(jwt)) {
      const result = await checkAndInvalidate();
      if (result === 'redirect_to_login') {
        throw new Error('Authentication required');
      }
      // After checkAndInvalidate, we should have a fresh JWT and client
      const newClient = queryClient.getQueryData(['supabaseClient']) as SupabaseClient | undefined;
      if (newClient) return newClient;
    }

    if (supabaseClient) return supabaseClient;

    // If we still don't have a valid client, throw an error
    throw new Error('Failed to obtain a valid Supabase client');
  };
}

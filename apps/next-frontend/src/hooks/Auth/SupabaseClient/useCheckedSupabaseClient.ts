import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientAtom, supabaseJWTAtom } from "@/atoms/atoms";
import { isJwtExpired } from "@/utils/app";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

export function useCheckedSupabaseClient(): () => Promise<SupabaseClient> {
  const queryClient = useQueryClient();
  const jwt = useAtomValue(supabaseJWTAtom);
  const supabaseClient = useAtomValue(supabaseClientAtom);

  return async (): Promise<SupabaseClient> => {
    if (!jwt || isJwtExpired(jwt)) {
      try {
        await queryClient.refetchQueries({
          queryKey: ['nonce', 'signature', 'supabaseJWT', 'supabaseClient'],
        });
      } catch (error) {
        console.error('Failed to refresh authentication:', error);
      }

      // Get the potentially new supabaseClient
      const newClient = queryClient.getQueryData(['supabaseClient']) as SupabaseClient | undefined;
      if (newClient) return newClient;
    }

    if (supabaseClient) return supabaseClient;

    // If we couldn't get a valid client, throw an error
    throw new Error('Failed to obtain a valid Supabase client');
  };
}

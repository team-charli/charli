// useSupabaseClient hook
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRef } from 'react';
import { AuthTokens } from '@/types/types';
import { authChainLogger } from '@/App';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY!;


interface SupabaseClientQueryParams {
  queryKey: [string, string | undefined];
  enabledDeps: boolean;
}

export const useSupabaseClientQuery = ({ queryKey, enabledDeps }: SupabaseClientQueryParams): UseQueryResult<SupabaseClient, Error> => {
  const supabaseClientRef = useRef<SupabaseClient | null>(null);

  return useQuery<SupabaseClient, Error>({
    queryKey,
    queryFn: async () => {
      authChainLogger.info("10a: start supabaseClient query");
      try {

        if (supabaseClientRef.current) {
          authChainLogger.info("10b: finish supabaseClient query -- Returning existing client");
          return supabaseClientRef.current;
        }

        authChainLogger.info("Creating new Supabase client");
        const newClient = createClient(supabaseUrl, supabaseAnonKey);
        if (typeof newClient.from !== 'function') {
          throw new Error('Supabase client does not have the expected structure');
        }
        // The session is automatically set on the client after a successful sign-in
        supabaseClientRef.current = newClient;
        authChainLogger.info("10b: finish supabaseClient query -- success");
        return newClient;
      } catch (error) {
        console.error("Error in supabaseClient query:", error);
        supabaseClientRef.current = null;
        throw error;
      }
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};

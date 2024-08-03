// useSupabaseClient hook
import { useQuery } from '@tanstack/react-query';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRef } from 'react';
import { AuthTokens } from '@/types/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;


interface SupabaseClientQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
}

export const useSupabaseClientQuery = ({ queryKey, enabledDeps }: SupabaseClientQueryParams) => {
  const supabaseClientRef = useRef<SupabaseClient | null>(null);

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log("10a: start supabaseClient query");
      try {

        if (supabaseClientRef.current) {
          console.log("10b: finish supabaseClient query -- Returning existing client");
          return supabaseClientRef.current;
        }

        // console.log("Creating new Supabase client");
        const newClient = createClient(supabaseUrl, supabaseAnonKey);

        // The session is automatically set on the client after a successful sign-in
        supabaseClientRef.current = newClient;
        console.log("10b: finish supabaseClient query -- success");
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

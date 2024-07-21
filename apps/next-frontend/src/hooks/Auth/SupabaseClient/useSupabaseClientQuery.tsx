// useSupabaseClient hook
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRef } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;

interface SupabaseClientQueryParams {
  queryKey: [string, string],
  enabledDeps: boolean,
  queryFnData: [string]
}

export const useSupabaseClientQuery = ({queryKey, enabledDeps, queryFnData}: SupabaseClientQueryParams) => {
  const [userJWT] = queryFnData;
  const supabaseClientRef = useRef<SupabaseClient | null>(null);

  return useQuery({
    queryKey,
    queryFn: () => {
      console.log("10a: start supabaseClient query");

      try {
        if (!userJWT || userJWT.length === 0) {
          console.log("10b: finish supabaseClient query -- No JWT available, returning null");
          supabaseClientRef.current = null;
          return null;
        }

        if (supabaseClientRef.current) {
          console.log("10b: finish supabaseClient query -- Returning existing client");
          return supabaseClientRef.current;
        }

        const options = {
          global: {
            headers: { Authorization: `Bearer ${userJWT}` },
          },
        };

        console.log("Creating new Supabase client");
        const newClient = createClient(supabaseUrl, supabaseAnonKey, options);
        supabaseClientRef.current = newClient;

        console.log("10b: finish supabaseClient query -- success");
        return newClient;
      } catch (error) {
        console.error("Error in supabaseClient query:", error);
        supabaseClientRef.current = null;
        throw error; // Re-throw the error so React Query can handle it
      }
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};

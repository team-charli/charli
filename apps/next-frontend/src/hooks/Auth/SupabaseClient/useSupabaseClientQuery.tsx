// useSupabaseClient hook
import { useQuery } from '@tanstack/react-query';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRef } from 'react';
import { AuthTokens } from '@/types/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;


interface SupabaseClientQueryParams {
  queryKey: [string, string | undefined];
  enabledDeps: boolean;
  queryFnData: [AuthTokens | null | undefined];
}

export const useSupabaseClientQuery = ({ queryKey, enabledDeps, queryFnData }: SupabaseClientQueryParams) => {
  const [authTokens] = queryFnData;
  const supabaseClientRef = useRef<SupabaseClient | null>(null);

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log("10a: start supabaseClient query");
      try {
        if (!authTokens) {
          console.log("10b: finish supabaseClient query -- No AuthTokens available, returning null");
          supabaseClientRef.current = null;
          return null;
        }

        if (supabaseClientRef.current) {
          console.log("10b: finish supabaseClient query -- Returning existing client");
          return supabaseClientRef.current;
        }

        console.log("Creating new Supabase client");
        const newClient = createClient(supabaseUrl, supabaseAnonKey);

        // Sign in with ID Token
        const { data, error } = await newClient.auth.signInWithIdToken({
          provider: authTokens.provider as 'google' | 'discord',
          token: authTokens.idToken,
          access_token: authTokens.accessToken, // Include the access token
        });
        console.log("Sending to Supabase - provider:", authTokens.provider);
        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error('Failed to create session');
        }

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

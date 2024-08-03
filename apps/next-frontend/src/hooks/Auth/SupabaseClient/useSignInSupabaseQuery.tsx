import { useQuery } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthTokens } from '@/types/types';

interface UseSignInSupabase {
  queryKey: [string, string | undefined];
  enabledDeps: boolean;
  queryFnData: [AuthTokens | null | undefined];
  supabaseClient: SupabaseClient | null | undefined;
}

interface SignInResult {
  authProviderId: string | null;
  user: any | null;
  error: Error | null;
}

export const useSignInSupabaseQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  supabaseClient
}: UseSignInSupabase) => {
  const [authTokens] = queryFnData;

  return useQuery<SignInResult, Error>({
    queryKey,
    queryFn: async (): Promise<SignInResult> => {
      if (!supabaseClient || !authTokens) {
        return { authProviderId: null, user: null, error: new Error('Missing Supabase client or auth tokens') };
      }

      try {
        let provider;
        if (authTokens.provider === 'googleJwt') {
          provider = 'google';
        } else {
          provider = authTokens.provider;
        }

        const { data, error } = await supabaseClient.auth.signInWithIdToken({
          provider,
          token: authTokens.idToken,
          access_token: authTokens.accessToken,
        });

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error('No user data returned from signInWithIdToken');
        }

        return {
          authProviderId: data.user.id,
          user: data.user,
          error: null
        };
      } catch (error) {
        console.error("Error in signInWithIdToken:", error);
        return { authProviderId: null, user: null, error: error as Error };
      }
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

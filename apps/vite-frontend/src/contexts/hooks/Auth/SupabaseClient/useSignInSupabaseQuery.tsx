//useSignInSupabaseQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { UnifiedAuth } from '@/types/types';

export interface SignInResult {
  authProviderId: string | null;
  user: User | null;
  session: Session | null;
  error: Error | null;
}

interface UseSignInSupabase {
  queryKey: [string, UnifiedAuth | string | null | undefined];
  enabledDeps: boolean;
  queryFnData: UnifiedAuth | null | undefined;
  supabaseClient: SupabaseClient | null | undefined;
}


export const useSignInSupabaseQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  supabaseClient,
}: UseSignInSupabase) => {
  let authMethod: UnifiedAuth | undefined;

  authMethod = queryFnData as UnifiedAuth;
  return useQuery<SignInResult, Error>({
    queryKey,
    queryFn: async (): Promise<SignInResult> => {

      if (supabaseClient && authMethod && Object.keys(authMethod).length > 0 && authMethod.idToken && authMethod.oauthAccessToken) {
        try {
          let provider;
          if (authMethod.authMethodType === 6) {
            provider = 'google'
          } else if (authMethod.authMethodType === 4) {
            provider = 'discord'
          } else {
            throw new Error('bad provider type')
          }

          const { data, error } = await supabaseClient.auth.signInWithIdToken({
            provider,
            token: authMethod.idToken,
            access_token: authMethod?.oauthAccessToken,
          })

          if (error) {
            console.error(error);
            throw error;
          }

          if (!data.user) {
            throw new Error('No user data returned from signInWithIdToken');
          }
          return {authProviderId: data.user.id, user: data.user, session: data.session, error: null}
        } catch (error) {
          console.error("Error in signInWithIdToken:", error);
          return { authProviderId: null, user: null, session: null, error: error as Error };
        }
      }  else {
        return { authProviderId: null, user: null, session: null, error: new Error('Missing Supabase client') };
      }
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

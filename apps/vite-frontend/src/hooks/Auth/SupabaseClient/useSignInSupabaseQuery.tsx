import { useQuery } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthData, AuthMethodPlus } from '@/types/types';

export interface SignInResult {
  authProviderId: string | null;
  user: any | null;
  error: Error | null;
}

interface UseSignInSupabase {
  queryKey: [string, string | undefined];
  enabledDeps: boolean;
  queryFnData: AuthData | AuthMethodPlus | null | undefined;
  supabaseClient: SupabaseClient | null | undefined;
}


export const useSignInSupabaseQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  supabaseClient,
}: UseSignInSupabase) => {
  // Initialize your variables
  let authData: AuthData | undefined;
  let authMethod: AuthMethodPlus | undefined;

  // Use 'in' operator as a type guard to differentiate between AuthData and AuthMethod
  if (queryFnData && 'idToken' in queryFnData) {
    // If queryFnData has a 'token' property, it's treated as AuthData
    authData = queryFnData as AuthData;
  } else if (queryFnData && 'accessToken' in queryFnData) {
    // If queryFnData has a 'method' property, it's treated as AuthMethod
    authMethod = queryFnData as AuthMethodPlus;
  }
  return useQuery<SignInResult, Error>({
    queryKey,
    queryFn: async (): Promise<SignInResult> => {
      console.log('called');

      if (supabaseClient && (authData && Object.keys(authData).length > 0)) {
        try {
          let provider;
          if (authData.provider === 'googleJwt') {
            provider = 'google';
          } else {
            provider = authData.provider;
          }

          const { data, error } = await supabaseClient.auth.signInWithIdToken({
            provider,
            token: authData.idToken,
            access_token: authData.accessToken,
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
      } else if (supabaseClient && authMethod && Object.keys(authMethod).length > 0) {
        try {
          let provider;
          if (authMethod.authMethodType === 6) {
            provider = 'googleJwt'
          } else if (authMethod.authMethodType === 4) {
            provider = 'discord'
          } else {
            throw new Error('bad provider type')
          }
          const { data, error } = await supabaseClient.auth.signInWithIdToken({
            provider,
            token: authMethod.idToken,
            access_token: authMethod?.accessToken,
          })
          console.log('useSignInSupabaseQuery', data);

          if (error) {
            console.error(error);
            throw error;
          }

          if (!data.user) {
            throw new Error('No user data returned from signInWithIdToken');
          }

          return {authProviderId: data.user.id, user: data.user, error: null}
        } catch (error) {
          console.error("Error in signInWithIdToken:", error);
          return { authProviderId: null, user: null, error: error as Error };
        }
      } else {
        return { authProviderId: null, user: null, error: new Error('Missing Supabase client or auth tokens') };
      }
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

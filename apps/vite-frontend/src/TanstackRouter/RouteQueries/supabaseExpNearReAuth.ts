//supabaseAtOrNearExp.ts
import { QueryClient } from "@tanstack/query-core";
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {AuthData} from '@types/types'
export interface SignInResult {
  authProviderId: string | null;
  user: User | null;
  session: Session | null;
  error: Error | null;
}

export const supabaseAtOrNearExp = async (queryClient: QueryClient, threshold: number): Promise<boolean> => {
  console.log('Starting supabaseAtOrNearExp function');
  console.log('Threshold:', threshold);

  const persistedAuthData: AuthDat | null | undefined = queryClient.getQueryData(['persistedAuthData']);
  console.log('Persisted Auth Data:', persistedAuthData);

  if (persistedAuthData) {
    const supabaseClient: SupabaseClient | undefined = queryClient.getQueryData(['supabaseClient', persistedAuthData.idToken]);
    console.log('Supabase Client:', supabaseClient ? 'Found' : 'Not Found');

    if (supabaseClient) {
      try {
        const session = await supabaseClient.auth.getSession();
        console.log('Session:', session);

        const expiresIn = session.data.session?.expires_in;
        const expiresAt = session.data.session?.expires_at;
        console.log('Expires In:', expiresIn);
        console.log('Expires At:', expiresAt);

        if (typeof expiresIn !== 'number') {
          console.error('Invalid expiresIn value:', expiresIn);
          throw new Error('no supabase.auth.session.expires_in value');
        }
        if (typeof expiresAt !== 'number') {
          console.error('Invalid expiresAt value:', expiresAt);
          throw new Error('no supabase.auth.session.expires_at value');
        }

        const now = Date.now(); // Current time in milliseconds
        console.log('Current time:', now);

        // Check if already expired
        if (expiresAt * 1000 <= now) {
          console.log('Session has expired');
          return true;
        }

        // Check if approaching expiration
        if (expiresIn <= threshold) {
          console.log('Session is approaching expiration');
          return true;
        }

        console.log('Session is still valid');
        return false;
      } catch (error) {
        console.error('Error in supabaseAtOrNearExp:', error);
        throw error;
      }
    }
  }

  console.log('No valid session found');
  return false;
};

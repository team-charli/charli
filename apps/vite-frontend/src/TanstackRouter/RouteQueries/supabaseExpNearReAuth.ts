import { QueryClient } from "@tanstack/query-core";
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { AuthData } from "@/types/types";

export interface SignInResult {
  authProviderId: string | null;
  user: User | null;
  session: Session | null;
  error: Error | null;
}

export const supabaseExpNearReAuth = async (queryClient: QueryClient, threshold: number) => {

  const persistedAuthData: AuthData | null | undefined = queryClient.getQueryData(['persistedAuthData']);

  if (persistedAuthData) {
    const supabaseClient: SupabaseClient | undefined = queryClient.getQueryData(['supabaseClient', persistedAuthData.idToken])
    if (supabaseClient){
      const session = await supabaseClient.auth.getSession();
      const expiresIn = session.data.session?.expires_in;
      if (typeof expiresIn !== 'number') throw new Error('no supabase.auth.session.expires_in value')
      return expiresIn <= threshold
    }
  }
  return false
}


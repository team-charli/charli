import { QueryClient } from "@tanstack/query-core";
import { Session, User } from '@supabase/supabase-js';

export interface SignInResult {
  authProviderId: string | null;
  user: User | null;
  session: Session | null;
  error: Error | null;
}

export const supabaseExpNearReAuth = (queryClient: QueryClient, threshold: number) => {

  const persistedAuthData: SignInResult | null | undefined = queryClient.getQueryData(['persistedAuthData']);
  if (!persistedAuthData) throw new Error('persistedAuthData undefined')
  const expiresIn = persistedAuthData.session?.expires_in;
  if (typeof expiresIn !== 'number') throw new Error('no supabase.auth.session.expires_in value')

  return expiresIn <= threshold
}

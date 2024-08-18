import { QueryClient } from "@tanstack/query-core";
import { SupabaseClient } from "@supabase/supabase-js";
import { AuthData } from "@/types/types";

export const signOutSupabase = async (queryClient: QueryClient ) => {
  const persistedAuthData: AuthData | null | undefined = queryClient.getQueryData(['persistedAuthData']);
  if (!persistedAuthData) throw new Error('persistedAuthData undefined')
  const supabaseClient: SupabaseClient | undefined = queryClient.getQueryData(['supabaseClient', persistedAuthData.idToken])

  if (!supabaseClient) throw new Error('supabaseClient is undefined')

  try {
  await supabaseClient.auth.signOut()

  } catch(e) {
    console.error("error supabaseClient.auth.signOut() ", e)
  }
}

// useIsOnboarded.ts
import { IRelayPKP } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

interface IsOnboardedParams {
  queryKey: [string, IRelayPKP | null | undefined];
  enabledDeps: boolean;
  queryFnData: [IRelayPKP | null | undefined];
  supabaseClient: SupabaseClient | null | undefined;
}

export const useIsOnboardedQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  supabaseClient,
}: IsOnboardedParams) => {

  const [currentAccount] = queryFnData;

  return useQuery({
    queryKey,
    queryFn: async () => {
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] 9a: start isOnboarded query`, {
        hasSupabaseClient: !!supabaseClient,
        hasCurrentAccount: !!currentAccount
      });

      if (!supabaseClient || !currentAccount) {
        return false;
      }

      const { data, error } = await supabaseClient
        .from("user_data")
        .select("id, user_address")
        .eq("user_address", currentAccount.ethAddress)
        .single();

      const isOnboarded = !error && !!data;

      console.log(`9b: isOnboarded query finish:`, (Date.now() - startTime) / 1000, isOnboarded );
      console.log('from isOnboarded: isOnboarded', isOnboarded);

      return isOnboarded;
    },

      enabled: enabledDeps
  });
};

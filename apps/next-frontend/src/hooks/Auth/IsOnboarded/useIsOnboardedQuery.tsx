// useIsOnboarded.ts
import { authChainLogger } from '@/pages/_app';
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
      authChainLogger.info("11a: start isOnboarded query");

      if (!supabaseClient || !currentAccount) {
        throw Error(`need supabase client or currentAccount`)
      }

      const { data, error } = await supabaseClient
        .from("user_data")
        .select("id, user_address")
        .eq("user_address", currentAccount.ethAddress)
        .limit(1);

      const isOnboarded = data && data.length > 0;

      authChainLogger.info("11b: finish isOnboarded query -- isOnboarded ", isOnboarded);
      authChainLogger.info("source isOnboarded", isOnboarded)

      return isOnboarded;
    },
      enabled: enabledDeps
  });
};

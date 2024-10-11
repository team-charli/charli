// useIsOnboarded.ts
import { authChainLogger } from '@/App';
import { IRelayPKP } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
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
  const [userID, setUserID] = useLocalStorage("userID");

  const [currentAccount] = queryFnData;
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        authChainLogger.info("11a: start isOnboarded query");
        if (!supabaseClient || !currentAccount) {
          authChainLogger.info ("no supabaseClient or currentAccount");
          throw Error(`need supabase client or currentAccount`)
        }
        // authChainLogger.info('currentAccount', currentAccount.ethAddress)

        const { data, error } = await supabaseClient
          .from("user_data")
          .select("id, user_address")
          .eq("user_address", currentAccount.ethAddress)
          .limit(1);

        const isOnboarded = data && data.length > 0;
        if (isOnboarded) setUserID(data[0].id)
        authChainLogger.info("11b: finish isOnboarded query -- isOnboarded ", isOnboarded);
        authChainLogger.info("source isOnboarded", isOnboarded)
        authChainLogger.info('isOnboarded', isOnboarded)
        return isOnboarded;
      } catch (error) {
        console.error("Error in isOnboarded query:", error);
        throw error; // Re-throw the error to be handled by React Query
      }
    },
    enabled: enabledDeps
  });
};

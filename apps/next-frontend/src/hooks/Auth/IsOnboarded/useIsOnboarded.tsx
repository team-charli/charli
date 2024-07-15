// useIsOnboarded.ts
import { useAtomValue, useSetAtom } from 'jotai';
import { isOnboardedAtom } from '@/atoms/atoms';
import { supabaseClientAtom } from '@/atoms/supabaseClientAtom';
import { useSupabaseQuery } from '@/hooks/Supabase/useSupabaseQuery';
import { useLitNodeClientReadyQuery } from '../LitAuth/useLitNodeClientReadyQuery';
import { useLitAccountQuery } from '../LitAuth/useLitAccountQuery';

export const useIsOnboarded = () => {
  const setIsOnboarded = useSetAtom(isOnboardedAtom);
  const supabaseClient = useAtomValue(supabaseClientAtom);
  const {data: litNodeClientReady} = useLitNodeClientReadyQuery();
  const {data: currentAccount} = useLitAccountQuery();

  // console.log('useIsOnboarded hook called', {
  //   supabaseClient: !!supabaseClient,
  //   litNodeClientReady,
  //   currentAccount: !!currentAccount
  // });

  return useSupabaseQuery(
    ['isOnboarded', currentAccount?.ethAddress ] as const,
    async (supabaseClient) => {
      const startTime = Date.now();
      console.log("9a: start isOnboarded query");

      if (!supabaseClient || !currentAccount) {
        return false;
      }

      const { data, error } = await supabaseClient
        .from("user_data")
        .select("id, user_address")
        .eq("user_address", currentAccount.ethAddress)
        .single();

      const isOnboarded = !error && !!data;

      setIsOnboarded(isOnboarded);
      console.log(`9b: isOnboarded query finish:`, (Date.now() - startTime) / 1000, isOnboarded );
      console.log('from isOnboarded: isOnboarded', isOnboarded);

      return isOnboarded;
    },
    {
      enabled: !!supabaseClient && litNodeClientReady,
    }
  );
};

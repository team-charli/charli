// useIsOnboarded.ts
import { useAtomValue, useSetAtom } from 'jotai';
import {  sessionSigsAtom, litAccountAtom, litNodeClientReadyAtom, isOnboardedAtom } from '@/atoms/atoms';
import { supabaseClientAtom } from '@/atoms/supabaseClientAtom';
import { useSupabaseQuery } from '../SupabaseClient/useSupabaseQuery';

export const useIsOnboarded = () => {
  const currentAccount = useAtomValue(litAccountAtom);
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const setIsOnboarded = useSetAtom(isOnboardedAtom);

  return useSupabaseQuery(
    ['isOnboarded', currentAccount?.ethAddress ] as const,
    async (supabaseClient, context) => {  // Note the context parameter here
      const startTime = Date.now();
      console.log("9a: start isOnboarded query");

      if (!supabaseClient || !currentAccount) {
        return false;
      }
      try {
        const { data, error } = await supabaseClient
          .from("user_data")
          .select("id, user_address")
          .eq("user_address", currentAccount.ethAddress)
          .single();
        const isOnboarded = !error && !!data;
        setIsOnboarded(isOnboarded);
        console.log(`9b: isOnboarded query finish:`, (Date.now() - startTime) / 1000, isOnboarded );
        return isOnboarded;
      } catch (e) {
        console.error('API call to user_address failed', e);
        return false;
      }
    },
    {
      enabled: !!currentAccount && !!sessionSigs && litNodeClientReady,
    }
  );
};

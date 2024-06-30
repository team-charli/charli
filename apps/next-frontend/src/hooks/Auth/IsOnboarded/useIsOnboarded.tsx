// useIsOnboarded.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { supabaseClientAtom, sessionSigsAtom, litAccountAtom, litNodeClientReadyAtom, isOnboardedAtom } from '@/atoms/atoms';

export const useIsOnboarded = () => {
  const supabaseClient = useAtomValue(supabaseClientAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const setIsOnboarded = useSetAtom(isOnboardedAtom);

  return useQuery({
    queryKey: ['isOnboarded', supabaseClient, sessionSigs, currentAccount, litNodeClientReady],
    queryFn: async (): Promise<boolean> => {
      if (!supabaseClient || !currentAccount || !sessionSigs || !litNodeClientReady) {
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
        return isOnboarded;
      } catch (e) {
        console.error('API call to user_address failed', e);
        return false;
      }
    },
    enabled: !!supabaseClient && !!currentAccount && !!sessionSigs && !!litNodeClientReady,
  });
};

// selectors/isOnboardedSelector.ts
import { selector } from 'recoil';
import { supabaseClientSelector } from '@/selectors/supabaseClientSelector';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';
import { sessionSigsAtom } from '@/atoms/litSessionAtoms';
import { litNodeClientReadyAtom } from '@/atoms/atoms';

export const isOnboardedSelector = selector<boolean>({
  key: 'isOnboardedSelector',
  get: async ({ get }) => {
    const supabaseClient = get(supabaseClientSelector);
    const currentAccount = get(currentAccountAtom);
    const sessionSigs = get(sessionSigsAtom);
    const litNodeClientReady = get(litNodeClientReadyAtom);

    if (!supabaseClient || !currentAccount || !sessionSigs || !litNodeClientReady) {
      return false;
    }

    try {
      const { data, error } = await supabaseClient
        .from("user_data")
        .select("id, user_address")
        .eq("user_address", currentAccount.ethAddress)
        .single();

      return !error && !!data;
    } catch (e) {
      console.error('API call to user_address failed', e);
      return false;
    }
  },
});

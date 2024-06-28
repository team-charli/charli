// atoms/isOnboardedAtom.ts
import { atomWithQuery } from 'jotai-tanstack-query';
import { } from '../SupabaseClient/supabaseClientAtom';
import { litNodeClientReadyAtom, supabaseClientAtom, litSessionAtom, fetchLitAccountsAtom } from '@/atoms/index';

export const isOnboardedAtom = atomWithQuery((get) => ({
  queryKey: ['isOnboarded', get(supabaseClientAtom), get(litSessionAtom), get(fetchLitAccountsAtom), get(litNodeClientReadyAtom)],
  queryFn: async (): Promise<boolean> => {
    const supabaseClient = get(supabaseClientAtom).data;
    const currentAccount = get(fetchLitAccountsAtom).data;
    const sessionSigs = get(litSessionAtom).data;
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
  enabled: !!get(supabaseClientAtom).data && !!get(fetchLitAccountsAtom).data && !!get(litSessionAtom).data && !!get(litNodeClientReadyAtom),
}));

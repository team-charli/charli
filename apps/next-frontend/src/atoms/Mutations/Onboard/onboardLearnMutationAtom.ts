import { atomWithMutation } from 'jotai-tanstack-query';
import { Database } from '@/supabaseTypes'; // Adjust the import path as needed
import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP } from '@lit-protocol/types';

type OnboardLearnVariables = {
  selectedLanguageCodes: number[];
  name: string;
  currentAccount: IRelayPKP;
  nativeLang: string;
  supabaseClient: SupabaseClient;
};

export const onboardLearnMutationAtom = atomWithMutation<any[], OnboardLearnVariables>((get) => ({
  mutationKey: ['onboardLearn'],
  mutationFn: async ({
    selectedLanguageCodes,
    name,
    currentAccount,
    nativeLang,
    supabaseClient
  }: OnboardLearnVariables) => {
    const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
      name: name,
      wants_to_learn_langs: selectedLanguageCodes,
      user_address: currentAccount.ethAddress,
      default_native_language: nativeLang,
    };

    const { data: user_data, error } = await supabaseClient
      .from('user_data')
      .insert([insertData])
      .select();

    if (error) {
      throw error;
    }

    return user_data || [];
  },
  onSuccess: (data, variables, context) => {
    // Instead of using queryClient directly, we can use the built-in invalidation method
    return {
      queryKey: ['isOnboarded'],
    };
  },
}));

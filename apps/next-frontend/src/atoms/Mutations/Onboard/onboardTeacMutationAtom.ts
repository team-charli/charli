import { atomWithMutation } from 'jotai-tanstack-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/supabaseTypes';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

type OnboardTeachVariables = {
  selectedLanguageCodes: number[];
  name: string;
  currentAccount: IRelayPKP | null | undefined;
  defaultNativeLanguage: string;
  supabaseClient: SupabaseClient;
  sessionSigs: SessionSigs;
};

export const onboardTeachMutationAtom = atomWithMutation<Database["public"]["Tables"]["user_data"]["Row"][] | null, OnboardTeachVariables>(() => ({
  mutationKey: ['onboardTeach'],
  mutationFn: async ({
    selectedLanguageCodes,
    name,
    currentAccount,
    defaultNativeLanguage,
    supabaseClient,
  }: OnboardTeachVariables) => {
    const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
      name: name,
      wants_to_teach_langs: selectedLanguageCodes,
      user_address: currentAccount.ethAddress,
      default_native_language: defaultNativeLanguage,
    };

    const { data: user_data, error } = await supabaseClient
      .from('user_data')
      .insert([insertData])
      .select();

    if (error) {
      throw error;
    }

    return user_data;
  },
  onSuccess: () => {
    // Invalidate the isOnboarded query
    return {
      queryKey: ['isOnboarded'],
    };
  },
  onError: (error) => {
    console.error("onboard submission error", error);
    // You might want to handle disconnection here if needed
    // litNodeClient.disconnect()
    throw new Error("submitOnboardTeachAPI error");
  },
}));

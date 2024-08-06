import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '../../../supabaseTypes';
import { useLitAccount, useSignInSupabase, useSupabaseClient } from '@/contexts/AuthContext';

type OnboardTeachVariables = {
  selectedLanguageCodes: number[];
  name: string;
  defaultNativeLanguage: string;
};

export const useOnboardTeachMutation = () => {
  const queryClient = useQueryClient();
  const { data: currentAccount } = useLitAccount();
  const { data: supabaseClient } = useSupabaseClient();
  const {data: signInSupabase } = useSignInSupabase()

  return useMutation<Database["public"]["Tables"]["user_data"]["Row"][] | null, Error, OnboardTeachVariables>({
    mutationFn: async (variables) => {
      if (!currentAccount) throw new Error('missing currentAccount');
      if (!supabaseClient) throw new Error('missing supabaseClient');
      if (!signInSupabase) throw new Error('missing signInSupabase');

      const { selectedLanguageCodes, name, defaultNativeLanguage } = variables;
      const { authProviderId } = signInSupabase;

      const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
        name: name,
        wants_to_teach_langs: selectedLanguageCodes,
        user_address: currentAccount.ethAddress,
        default_native_language: defaultNativeLanguage,
        auth_provider_id: authProviderId,

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
      queryClient.invalidateQueries({ queryKey: ['isOnboarded'] });
    },
    onError: (error) => {
      console.error("onboard submission error", error);
      throw new Error("submitOnboardTeachAPI error");
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('JWT expired'))) {
        return failureCount < 3;
      }
      return false;
    },
  });
};

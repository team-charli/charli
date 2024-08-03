import { useLitAccount, useSignInSupabase, useSupabaseClient } from '@/contexts/AuthContext';
import { Database } from '@/supabaseTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type OnboardLearnVariables = {
  selectedLanguageCodes: number[];
  name: string;
  nativeLang: string;
};

export const useOnboardLearnMutation = () => {
  const queryClient = useQueryClient();
  const { data: currentAccount } = useLitAccount();
  const { data: supabaseClient } = useSupabaseClient();
  const {data: signInSupabase } = useSignInSupabase()

  return useMutation<any[], Error, OnboardLearnVariables>({
    mutationFn: async (variables) => {
      if (!currentAccount) throw new Error('missing currentAccount');
      if (!supabaseClient) throw new Error('missing supabaseClient');
      if (!signInSupabase) throw new Error('missing signInSupabase');

      const { selectedLanguageCodes, name, nativeLang } = variables;
      const { authProviderId } = signInSupabase;
      const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
        name: name,
        wants_to_learn_langs: selectedLanguageCodes,
        user_address: currentAccount.ethAddress,
        default_native_language: nativeLang,
        auth_provider_id: authProviderId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isOnboarded'] });
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('JWT expired'))) {
        return failureCount < 3;
      }
      return false;
    },
  });
};

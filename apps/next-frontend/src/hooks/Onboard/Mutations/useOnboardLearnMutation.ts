import { litAccountAtom, sessionSigsAtom } from '@/atoms/atoms';
import { useSupabaseMutation } from '@/hooks/Supabase/useSupabaseMutation';
import { Database } from '@/supabaseTypes'; // Adjust the import path as needed
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

type OnboardLearnVariables = {
  selectedLanguageCodes: number[];
  name: string;
  nativeLang: string;
};

export const useOnboardLearnMutation = () => {
  const queryClient = useQueryClient();
  const currentAccount = useAtomValue(litAccountAtom);

  return useSupabaseMutation<any[], Error, OnboardLearnVariables>(
    async (supabaseClient, variables) => {
      const { selectedLanguageCodes, name, nativeLang } = variables;
      if (!currentAccount) throw new Error('missing currentAccount');

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
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['isOnboarded'] });
      },
    }
  );
};

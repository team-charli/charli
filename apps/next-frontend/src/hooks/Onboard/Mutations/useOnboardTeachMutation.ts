import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { Database } from '../../../supabaseTypes';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseMutation } from '@/hooks/Supabase/useSupabaseMutation';
import { useAtomValue } from 'jotai';
import { litAccountAtom, sessionSigsAtom } from '@/atoms/atoms';

type OnboardTeachVariables = {
  selectedLanguageCodes: number[];
  name: string;
  defaultNativeLanguage: string;
};

export const useOnboardTeachMutation = () => {
  const queryClient = useQueryClient();
  const currentAccount = useAtomValue(litAccountAtom);
  const sessionSigs = useAtomValue(sessionSigsAtom);

  return useSupabaseMutation<Database["public"]["Tables"]["user_data"]["Row"][] | null, Error, OnboardTeachVariables>(
    async (supabaseClient, variables) => {
      const { selectedLanguageCodes, name, defaultNativeLanguage } = variables;
      if (!currentAccount) throw new Error('missing currentAccount');

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
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['isOnboarded'] });
      },
      onError: (error) => {
        console.error("onboard submission error", error);
        throw new Error("submitOnboardTeachAPI error");
      },
    }
  );
};

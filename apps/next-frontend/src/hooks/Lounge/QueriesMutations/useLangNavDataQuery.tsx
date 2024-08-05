// useLangNavDataQuery.ts
import { useQuery } from '@tanstack/react-query';
import { useIsOnboarded, useLitAccount, useSupabaseClient } from '@/contexts/AuthContext';

interface Language {
  id: number;
  name: string;
  language_code: string;
  country_code: string | null;
  emoji: string | null;
}

interface UserLanguages {
  wantsToTeachLangs: (Language | null)[]
;
  wantsToLearnLangs: (Language | null)[];

}

interface UserDataResponse {
  wants_to_teach_langs: number[];
  wants_to_learn_langs: number[];
}

export const useLangNavDataQuery = () => {
  const {data: supabaseClient} = useSupabaseClient();
  const {data: litAccount} = useLitAccount();
  const {data: isOnboarded} = useIsOnboarded();
  console.log('call useIsOnboarded -- useLangNavDataQuery')

  const fetchLanguages = async (): Promise<UserLanguages> => {
    if (!supabaseClient) throw new Error('supabaseClient undefined');
    if (!litAccount) throw new Error('litAccount not available');
    if (supabaseClient && typeof supabaseClient.from !== 'function') {
      console.log("supabaseClient without the from method???", supabaseClient)
    }

    const { data, error } = await supabaseClient
      .from('user_data')
      .select(`wants_to_teach_langs, wants_to_learn_langs`)
      .eq('user_address', litAccount.ethAddress)
      .single<UserDataResponse>();

    if (error) throw error;

    const fetchLanguageDetails = async (languageIds: number[]) => {
      return Promise.all(
        languageIds.map(async (languageId: number) => {
          const { data: languageData } = await supabaseClient
            .from('languages')
            .select('*')
            .eq('id', languageId)
            .single<Language>();
          return languageData;
        })
      );
    };

    const wantsToTeachLangs = await fetchLanguageDetails(data?.wants_to_teach_langs || []);
    const wantsToLearnLangs = await fetchLanguageDetails(data?.wants_to_learn_langs || []);

    return { wantsToTeachLangs, wantsToLearnLangs };
  };

  return useQuery<UserLanguages, Error>({
    queryKey: ['langNavData'],
    queryFn: fetchLanguages,
    enabled: !!supabaseClient && !!isOnboarded
  });
};

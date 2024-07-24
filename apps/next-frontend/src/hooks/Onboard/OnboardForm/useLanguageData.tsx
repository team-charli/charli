import { useSupabaseClient } from '@/contexts/AuthContext';
import { LanguageButton } from '@/types/types';
import { useQuery } from '@tanstack/react-query';

export const useLanguageData = () => {
  const {data: supabaseClient} = useSupabaseClient();
  return useQuery({
    queryKey: ['platformLanguages'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('languages')
        .select('*');
      if (error) throw error;
      return data?.map((langObj: any) => ({
        id: langObj.id,
        language: langObj.name,
        languageCode: langObj.language_code,
        flag: langObj.emoji
      } as LanguageButton)) || [];
    },
    enabled: supabaseClient
  }

  );
};

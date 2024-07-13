import { useSupabaseQuery } from '@/hooks/Supabase/useSupabaseQuery';
import { LanguageButton, SupabaseError } from '@/types/types';

export const useLanguageData = () => {
  return useSupabaseQuery<LanguageButton[], SupabaseError>(
    ['platformLanguages'] as const,
    async (supabaseClient) => {
      const { data, error } = await supabaseClient
        .from('languages')
        .select('*');
      if (error) throw error;
      return data?.map(langObj => ({
        id: langObj.id,
        language: langObj.name,
        languageCode: langObj.language_code,
        flag: langObj.emoji
      } as LanguageButton)) || [];
    }
  );
};

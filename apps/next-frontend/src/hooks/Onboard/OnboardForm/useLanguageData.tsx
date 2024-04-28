// useLanguageData.ts
import { useState, useEffect } from 'react';
import { LanguageButton } from '@/types/types';
import { useSupabase } from '@/contexts';

export const useLanguageData = () => {
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const [languageButtons, setLanguageButtons] = useState<LanguageButton[]>([]);

  useEffect(() => {
    const fetchLanguageData = async () => {
      if (supabaseClient && !supabaseLoading) {
        try {
          const {data, error} = await supabaseClient
            .from('languages')
            .select('*');
          if (data) {

            const languageData = data.map(langObj => ({language: langObj.name, languageCode: langObj.language_code, flag: langObj.emoji, isSelected: false}))
            setLanguageButtons(languageData);

          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    fetchLanguageData();
  }, []);

  return { languageButtons, setLanguageButtons };
};


// useLanguageData.ts
import { useState, useEffect } from 'react';
import { LanguageButton } from '@/types/types';
import { supabaseClientSelector } from '@/selectors/supabaseClientSelector';
import { useRecoilValue } from 'recoil';

export const useLanguageData = () => {
  const supabaseClient = useRecoilValue(supabaseClientSelector);
  const [languageButtons, setLanguageButtons] = useState<LanguageButton[]>([]);

  useEffect(() => {
    const fetchLanguageData = async () => {
      // console.log('supabaseClient', Boolean(supabaseClient))
      if (supabaseClient) {
        try {
          const {data, error} = await supabaseClient
            .from('languages')
            .select('*');
          if (data) {
            const languageData = data.map(langObj => ({id: langObj.id, language: langObj.name, languageCode: langObj.language_code, flag: langObj.emoji, isSelected: false}))

            // console.log('languageData', languageData)
            setLanguageButtons(languageData);

          } else if (error) {
            console.log(error)
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    void (async () => {
      await fetchLanguageData();
    })();
  }, [supabaseClient]);

  return { languageButtons, setLanguageButtons };
};


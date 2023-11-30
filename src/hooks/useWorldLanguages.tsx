
import languages from '../utils/languageCountryMap.ts'
import { getEmojiFlag, TCountryCode } from 'countries-list';

interface Country {
  country_code: TCountryCode;
  country_name: string;
  lang_iso2: string;
}

type LanguageCountriesArray = Array<{ [language: string]: Country[] }>;

export interface ifaceNewObj {
  language: string;
  flag: string;
}

//TODO: Randomize a secondary flag to be shown with each language if it has more than one country.
//NOTE: Display the most demanded languages repeated with a randomized secondary flag for languages that have more than one country.
//NOTE: Display the combo box to add and select another lang/country
//TODO: Display a language with the flag of the primary country
export const useWorldLanguages = (targetedLanguages: string[] =['English', 'Spanish', 'Chinese', 'Thai', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Hindi']) => {











  const languageObjects: ifaceNewObj[] = [];

  languages.forEach(languageObj => {
    Object.entries(languageObj).forEach(([lang_name, countries]) => {
      const firstCountryCode = countries[0]?.country_code as TCountryCode;
      languageObjects.push({
        language: lang_name,
        flag: getEmojiFlag(firstCountryCode),
      });
    });
  });

  return languageObjects;
};

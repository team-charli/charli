import { useState, useEffect } from 'react';
import { primaryFlagRules } from '../../utils/geo/primaryFlags';
import { useGetUserCountry } from './useGetUserCountry';
import { LanguageInfo, CountryDataset, LanguageDataset, LangIso2NameMap  } from '../../types/types';
import countryDatasetJson from '../../data/countryDataset.json';
import languageDatasetJson from '../../data/languageDataset.json';
import _langIso2Name from '../../data/isoLang2Name.json'
const langIso2Name: LangIso2NameMap = _langIso2Name;

const countryDataset: CountryDataset = countryDatasetJson;
const languageDataset: LanguageDataset = languageDatasetJson;

export const useGetUsersFlags = (): LanguageInfo[] | null => {
  const primaryLanguages: string[] = ['eng', 'spa', 'zho', 'tha', 'fra', 'deu', 'ita', 'por', 'jpn', 'kor', 'hin'];
  const [langArr, setLangArr] = useState<LanguageInfo[] | null>(null);
  const geoLoCountry = useGetUserCountry();

  const getFlagEmojis = (language: string, geLoCountryA3Code: string): [string, string] => {
    // if (language === 'deu') {
    //   debugger;
    // }
    const countryInfo = countryDataset[geLoCountryA3Code];
    if (!countryInfo) throw new Error(`Country information not found for code: ${geLoCountryA3Code}`);

    const subRegion = countryInfo.subRegion;
    const intermediateRegion = countryInfo.intermediateRegion;

    const primaryCountryCode = primaryFlagRules[language]?.[subRegion] ||
      primaryFlagRules[language]?.[intermediateRegion] ||
      primaryFlagRules[language]?.['All'];

    if (!primaryCountryCode) throw new Error(`Primary flag code not found for language: ${language}`);

    const languageName = langIso2Name[language]
    const languageData = languageDataset[languageName];

    if (!languageData) throw new Error(`Language data not found for language: ${language}`);
    // if (language === 'fra') {
    //   debugger;
    // }
    const primaryFlag = languageData.flags[languageData.countries.indexOf(primaryCountryCode)];
    const secondaryFlags = languageData.flags.filter((_, index: number) => languageData.countries[index] !== primaryCountryCode);
    const randomSecondaryFlag = secondaryFlags[Math.floor(Math.random() * secondaryFlags.length)];

    return [primaryFlag, randomSecondaryFlag];
  };

  useEffect(() => {
    if (geoLoCountry && geoLoCountry.country_a3) {
      const _langArr = primaryLanguages.map(langA3 => {
        const language = langIso2Name[langA3];
        let omitSecondaryFlag = false;
        if (['ita', 'tha', 'zho', 'kor', 'jpn', 'hin'].includes(langA3)) {
          omitSecondaryFlag = true;
        }
        const [primaryFlag, secondaryFlag] = getFlagEmojis(langA3, geoLoCountry.country_a3.toUpperCase());
        return {
          language,
          langA3,
          primaryFlag,
          secondaryFlag,
          omitSecondaryFlag,
        };
      });
      setLangArr(_langArr);
    }
  }, [geoLoCountry]);
  // console.log({langArr});

  return langArr;
};

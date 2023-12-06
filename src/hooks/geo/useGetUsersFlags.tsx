import languages from '../../utils/geo/languageCountryMap.ts';
import { primaryFlagRules } from '../../utils/geo/primaryFlags';
import { useHookNullCheck } from '../../hooks/utils/useHookNullCheck';
import { useGetUserCountry } from './useGetUserCountry';
import { useGetUserSubRegion } from './useGetUserSubRegion';
import { useGetEmojiFlag } from './useGetEmojiFlag';

export interface LanguageInfo {
  language: string;
  primaryFlag: string;
  secondaryFlag: string;
  country_a2: string;
}

export const useGetUsersFlags = (primaryLanguages: string[] = ['eng', 'spa', 'zho', 'tha', 'fra', 'deu', 'ita', 'por', 'jpn', 'kor', 'hin']): LanguageInfo[] => {
  const { country: { country_a3, country_a2 } } = useHookNullCheck(useGetUserCountry, 'country');
  const userSubRegion = useGetUserSubRegion(country_a3);

  const getPrimaryFlag = (language: string, subRegion: string): string => {
    const rule = (primaryFlagRules as any)[language];
    const flagCode = rule && subRegion in rule ? rule[subRegion] || rule['All'] || '' : '';
    return useGetEmojiFlag(flagCode);
  };

  const getSecondaryFlag = (language: string, primaryCountryCode: string): string => {
    const languageCountries = (languages as any)[language];
    if (!languageCountries) return '';

    const eligibleCountries = languageCountries.filter((country: any) => country.country_code !== primaryCountryCode);
    return eligibleCountries.length > 0 ? useGetEmojiFlag(eligibleCountries[Math.floor(Math.random() * eligibleCountries.length)].country_code) : '';
  };

  return primaryLanguages.map(language => {
    const primaryCountryCode = getPrimaryFlag(language, userSubRegion);
    const primaryFlag = useGetEmojiFlag(primaryCountryCode);
    const secondaryFlag = getSecondaryFlag(language, primaryCountryCode);

    return {
      language,
      primaryFlag,
      secondaryFlag,
      country_a2,
    };
  });
};

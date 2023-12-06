import { useEffect, useState } from 'react';
import countriesData from '../../utils/geo/emojiFlagCountryMap.json';

export const useGetEmojiFlag = (alpha3CountryCode: string) => {

  interface ifaceEmojiCountry {
    cca3: string;
    name: string;
    flag: string;
  }

  const countries: ifaceEmojiCountry[] = countriesData;

  const [subRegion, setSubRegion] = useState('');

  useEffect(() => {
    const findFlag = (): string => {
      const country = countries.find(country => country['cca3'] === alpha3CountryCode);
      return country ? country['flag'] : '';
    };

    setSubRegion(findFlag());
  }, [alpha3CountryCode]);

  return subRegion;
};



import { useEffect, useState } from 'react';
import countriesData from '../../utils/geo/countries.json';
import { Country } from '../../types/types'

const countries: Country[] = countriesData;

export const useGetUserSubRegion = (alpha3CountryCode: string): string => {
  const [subRegion, setSubRegion] = useState('');

  useEffect(() => {
    const findSubRegion = (): string => {
      const country = countries.find(country => country['alpha-3'] === alpha3CountryCode);
      return country ? country['sub-region'] : '';
    };

    setSubRegion(findSubRegion());
  }, [alpha3CountryCode]);

  return subRegion;
};


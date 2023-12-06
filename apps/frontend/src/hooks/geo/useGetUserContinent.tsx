import geojsonPlaces, { ContinentInfo } from 'geojson-places';
import { useEffect, useState } from 'react';

export const useGetUserContinent = (continentCode: string) => {
  const [continentData, setContinentData] = useState<ContinentInfo| null>(null)
  const [error, setError] = useState<string>('');
  useEffect(() => {
    const result = geojsonPlaces.getContinentByCode(continentCode);
    if (result) {
      setContinentData(result);
    } else {
      setError('No country data found for these coordinates');
    }

  }, [continentCode])
  return continentData?.continent_name;
}


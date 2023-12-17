import { useEffect, useState } from 'react';
import geojsonPlaces, { RegionInfo } from 'geojson-places';
import { useGetUserCoordinates } from './useGetUserCoordinates';

export function isRegionInfo(obj: any): obj is RegionInfo {
  return (
    obj &&
    typeof obj.continent_code === 'string' &&
    typeof obj.country_a2 === 'string' &&
    typeof obj.country_a3 === 'string' &&
    typeof obj.region_code === 'string' &&
    typeof obj.state_code === 'string'
  );
}

export const useGetUserCountry = () => {
  const { location, error: coordinatesError } = useGetUserCoordinates();
  const [country, setCountry] = useState<RegionInfo | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (location) {
      try {
        const result = geojsonPlaces.lookUp(location.lat, location.long);
        if (result) {
          setCountry(result);
        } else {
          setError('No country data found for these coordinates');
        }
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError('Error looking up country: ' + errorMessage);
      }
    } else if (coordinatesError) {
      setError(coordinatesError);
    }
  }, [location, coordinatesError]);

  if (error) throw (error);

  return country;

};

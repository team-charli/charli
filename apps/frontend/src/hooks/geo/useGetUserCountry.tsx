import isEqual from 'lodash.isequal';
import { useEffect, useState, useMemo } from 'react';
import geojsonPlaces, { RegionInfo } from 'geojson-places';
import { useGetUserCoordinates } from './useGetUserCoordinates';

export const useGetUserCountry = () => {
  const { location, error: coordinatesError } = useGetUserCoordinates();
  const [country, setCountry] = useState<RegionInfo | null>(null);

  useEffect(() => {
   console.log({location});

    if (location) {
      try {
        const result = geojsonPlaces.lookUp(location.lat, location.long);
        if (result && !isEqual(result, country)) {
          setCountry(result);
        }
      } catch (err) {
        // Handle error
      }
    }
  }, [location, country]);

  // Handle coordinatesError separately

  return useMemo(() => country, [country]);
};

import { useState, useMemo } from 'react';
import { GeolocationApiResponse } from '../../types/types';
import ky from 'ky';
import { useAsyncEffect } from '../utils/useAsyncEffect';

type LocationState = {
  lat: number;
  long: number;
};

export const useGetUserCoordinates = () => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string>('');

  useAsyncEffect(async () => {
    try {
      const response = await ky('http://ip-api.com/json/').json<GeolocationApiResponse>();
      setLocation({
        lat: response.lat,
        long: response.lon,
      });
    } catch (err: any) {
      setError('Unable to retrieve location: ' + err.message);
    }
  }, () => Promise.resolve(), []);

  // Only include location in the dependency array. If location is null, useMemo won't throw an error.
  const memoizedLocation = useMemo(() => location, [location]);

  return { location: memoizedLocation, error };
};

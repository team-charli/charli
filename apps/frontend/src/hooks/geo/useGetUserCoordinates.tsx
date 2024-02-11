import { useState, useMemo, useEffect } from 'react';
import { GeolocationApiResponse } from '../../types/types';
import ky from 'ky';
import { useAsyncEffect } from '../utils/useAsyncEffect';
import { useNetwork } from '../../contexts/NetworkContext';

type LocationState = {
  lat: number;
  long: number;
};

export const useGetUserCoordinates = () => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string>('');
  const {isOnline} = useNetwork();

  // useEffect(() => {
  //     // Log the previous and current value of the dependency
  //     console.log('Previous dependency:', locationRef.current);
  //     console.log('Current dependency:', location);

  //     // Update the ref with the current value for the next render
  //     locationRef.current = location;
  //   }, [location]); // Dependency array

  useAsyncEffect(async () => {
    if (isOnline) {
      try {
        const response = await ky('http://ip-api.com/json/').json<GeolocationApiResponse>();
        setLocation({ lat: response.lat, long: response.lon });
      } catch (err: any) {
        setError('Unable to retrieve location: ' + err.message);
      }
    }
  }, () => Promise.resolve(), []);

  // Only include location in the dependency array. If location is null, useMemo won't throw an error.
  const memoizedLocation = useMemo(() => location, [location]);

  return { location: memoizedLocation, error };
};

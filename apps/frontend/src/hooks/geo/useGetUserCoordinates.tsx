import { useEffect, useState } from 'react';
import { GeolocationApiResponse } from '../../types/types';
import ky from 'ky';

type LocationState = {
  lat: number;
  long: number;
};

export const useGetUserCoordinates = () => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    ky('http://ip-api.com/json/').json<GeolocationApiResponse>()
      .then(response => {
        if (response.lat !== null && response.lon !== null) {
          setLocation({
            lat: response.lat,
            long: response.lon,
          });
        } else {
          throw new Error('Location data is null');
        }
      })
      .catch(err => {
        setError('Unable to retrieve location: ' + err.message);
        throw err;  // Propagating the error
      });
  }, []);

  return { location, error };
};

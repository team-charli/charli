import { useState } from 'react';
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
    console.log("call ip")
    try {
    const response =  await ky('http://ip-api.com/json/').json<GeolocationApiResponse>()
        console.log(' ip location',  response)
        if (response.lat !== null && response.lon !== null) {
          setLocation({
            lat: response.lat,
            long: response.lon,
          });
        } else {
          throw new Error('Location data is null');
        }
    }
       catch(err: any)  {
        setError('Unable to retrieve location: ' + err.message );
        throw err;  // Propagating the error
      }
  },
    async () => Promise.resolve(),

  );
  return { location, error };
};

import { useQuery } from '@tanstack/react-query';
import { litNodeClient } from '@/utils/litClients';

const TIMEOUT_DURATION = 10000; // 10 seconds
const MAX_RETRIES = 3;

export const useLitNodeClientReadyQuery = () => {
  return useQuery<boolean, Error>({
    queryKey: ['litNodeClientReady'],
    queryFn: async (): Promise<boolean> => {
      if (litNodeClient.ready) {
        console.log('LitNodeClient already connected');
        return true;
      }

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const startTime = Date.now();

          const connectPromise = litNodeClient.connect();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), TIMEOUT_DURATION)
          );

          await Promise.race([connectPromise, timeoutPromise]);

          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          console.log(`Connection time for attempt ${attempt}: ${duration} seconds`);

          if (litNodeClient.ready) {
            return true;
          } else {
            throw new Error('LitNodeClient connected but not ready');
          }
        } catch (error) {
          console.error(`Error connecting LitNodeClient (attempt ${attempt}/${MAX_RETRIES}):`, error);
          if (attempt === MAX_RETRIES) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      throw new Error('Unexpected error in LitNodeClient connection');
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};

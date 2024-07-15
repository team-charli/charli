import { useQuery } from '@tanstack/react-query';
import { litNodeClient } from '@/utils/litClients';

const TIMEOUT_DURATION = 10000; // 10 seconds
const MAX_RETRIES = 3;

export const useLitNodeClientReadyQuery = () => {

  return useQuery<boolean, Error>({
    queryKey: ['litNodeClientReady'],
    queryFn: async (): Promise<boolean> => {
      // console.log("0a: start litNodeClient connect attempts");

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const startTime = Date.now();
          // console.log(`Attempt ${attempt}: Starting litNodeClient connect`);

          const connectPromise = litNodeClient.connect();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), TIMEOUT_DURATION)
          );

          await Promise.race([connectPromise, timeoutPromise]);

          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;

          // console.log(`LitNodeClient connected successfully on attempt ${attempt}`);
          console.log(`Connection time for attempt ${attempt}: ${duration} seconds`);

          return true;
        } catch (error) {
          console.error(`Error connecting LitNodeClient (attempt ${attempt}/${MAX_RETRIES}):`, error);

          if (attempt === MAX_RETRIES) {
            throw error;
          }

          // Wait before retrying (you can implement exponential backoff here if needed)
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay between retries
        }
      }

      // This line should never be reached due to the throw in the last iteration of the loop
      throw new Error('Unexpected error in LitNodeClient connection');
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false, // We're handling retries manually in the queryFn
  });
};

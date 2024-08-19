//useLitNodeClientReadyQuery.tsx
import { useQuery } from '@tanstack/react-query';
import { litNodeClient } from '@/utils/litClients';
import { authChainLogger } from '@/App';

const TIMEOUT_DURATION = 10000; // 10 seconds
const MAX_RETRIES = 3;

export const useLitNodeClientReadyQuery = () => {
  return useQuery<boolean, Error>({
    queryKey: ['litNodeClientReady'],
    queryFn: async (): Promise<boolean> => {
      // authChainLogger.info("0a: start litNodeClientReady");

      if (litNodeClient.ready) {

        authChainLogger.info('0b: finish litNodeClientReady -- LitNodeClient already connected');
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
          // authChainLogger.info(`Connection time for attempt ${attempt}: ${duration} seconds`);

          if (litNodeClient.ready) {
            authChainLogger.info("0b: finish litNodeClientReady -- ready");

            return true;
          } else {
            // authChainLogger.info("0b: finish litNodeClientReady");
            throw new Error('LitNodeClient connected but not ready');
          }
        } catch (error) {
          console.error(`Error connecting LitNodeClient (attempt ${attempt}/${MAX_RETRIES}):`, error);
          if (attempt === MAX_RETRIES) {
            authChainLogger.info("Error -- 0b: finish litNodeClientReady --- max retries exceeded");
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      throw new Error('Error-- 0b: finish litNodeClientReady -- Unexpected error in LitNodeClient connection');
    },
    staleTime: 0, // Always consider the data stale
    gcTime: 0, // Don't cache the result
    // refetchOnMount: true, // Refetch on every mount
    // refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: false, // Keep this as is if you don't want retries on failure
  });
};

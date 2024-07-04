import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import {litNodeClient} from '@/utils/litClients'
import { litNodeClientReadyAtom, litNodeClientReadyErrorAtom } from '@/atoms/atoms';
export const useLitNodeClientReadyQuery = () => {
  const setLitNodeClientReady = useSetAtom(litNodeClientReadyAtom);
  const setLitNodeClientReadyError = useSetAtom(litNodeClientReadyErrorAtom);



  return useQuery<boolean, Error>({
    queryKey: ['litNodeClientReady'],
    queryFn: async (): Promise<boolean> => {
      const startTime = Date.now();
      console.log("0a: start litNodeClient connect");
      try {
        const connectPromise = litNodeClient.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000) // 10 second timeout
        );
        await Promise.race([connectPromise, timeoutPromise]);
        console.log("LitNodeClient connected successfully");
        setLitNodeClientReady(true);
        console.log(`0b: litNodeClientReady finish:`, (Date.now() - startTime) / 1000);

        return true;
      } catch (error) {
        console.error("Error connecting LitNodeClient:", error);
        setLitNodeClientReadyError(error instanceof Error ? error : new Error('Unknown error connecting LitNodeClient'));
        throw error;
      }
    },
    staleTime: Infinity, // The result won't go stale
    gcTime: Infinity, // Keep the result cached indefinitely (formerly cacheTime)
    retry: false, // Don't retry on failure
  });
};

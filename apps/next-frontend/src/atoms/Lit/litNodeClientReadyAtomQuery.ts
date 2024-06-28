import { atomWithQuery } from 'jotai-tanstack-query';
import { litNodeClient } from '@/utils/litClients';

const connectLitNodeClient = async () => {
  console.log("Attempting to connect LitNodeClient");
  try {
    const connectPromise = litNodeClient.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), 10000) // 10 second timeout
    );
    await Promise.race([connectPromise, timeoutPromise]);
    console.log("LitNodeClient connected successfully");
    return true;
  } catch (error) {
    console.error("Error connecting LitNodeClient:", error);
    throw error;
  }
};

export const litNodeClientReadyAtom = atomWithQuery(() => ({
  queryKey: ['litNodeClientReady'],
  queryFn: connectLitNodeClient,
  staleTime: Infinity, // The result won't go stale
  cacheTime: Infinity, // Keep the result cached indefinitely
  retry: false, // Don't retry on failure
}));

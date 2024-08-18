import { SessionSigs } from "@lit-protocol/types";
import { QueryClient } from "@tanstack/query-core";


//number in seconds
export const sessionSigsExNearReAuth = (queryClient: QueryClient, threshold: number = 0): boolean => {
  const sessionSigs = queryClient.getQueryData(['litSessionSigs']) as SessionSigs | null | undefined;

  const caller = new Error().stack?.split('\n')[2].trim().split(' ')[1] || 'unknown';
  const currentTime = new Date().getTime();

  for (const key in sessionSigs) {
    if (Object.prototype.hasOwnProperty.call(sessionSigs, key)) {
      const signedMessage = JSON.parse(sessionSigs[key].signedMessage);
      const expirationTime = new Date(signedMessage.expiration).getTime();
      const timeUntilExpire = expirationTime - currentTime;

      if (timeUntilExpire <= threshold) {
        console.log(`sessionSigsExpired (${caller}): ${key} will expire within ${threshold}ms`);
        return true;
      }
    }
  }
  return false;
}

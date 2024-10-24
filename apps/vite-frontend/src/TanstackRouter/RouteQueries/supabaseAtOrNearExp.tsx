//supabaseAtOrNearExp.tsx
import { QueryClient } from "@tanstack/query-core";
import { AuthData } from "@/types/types";

function decodeJwtPayload(token: string): any {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

export const supabaseAtOrNearExp = (queryClient: QueryClient, threshold: number): boolean => {
  const persistedAuthData: AuthData | null | undefined = queryClient.getQueryData(['persistedAuthData']);

  if (!persistedAuthData || !persistedAuthData.idToken) {
    console.warn('No idToken found in persistedAuthData');
    // Since we cannot determine the expiration, we assume the token is not expired.
    return false;
  }

  const idToken = persistedAuthData.idToken;
  try {
    const payload = decodeJwtPayload(idToken);
    if (!payload.exp) {
      console.error('No exp claim in idToken');
      return true; // Consider expired if no expiration claim.
    }

    const currentTime = Date.now() / 1000; // in seconds
    if (payload.exp <= currentTime) {
      console.log('idToken has expired');
      return true;
    }

    if ((payload.exp - currentTime) <= threshold) {
      console.log('idToken is approaching expiration');
      return true;
    }

    return false; // Token is valid.
  } catch (error) {
    console.error('Error decoding idToken:', error);
    return true; // Consider expired if there's an error decoding.
  }
};

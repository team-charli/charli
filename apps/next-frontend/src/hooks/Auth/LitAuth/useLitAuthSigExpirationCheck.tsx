import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { authSigExpiredAtom } from '@/atoms/atoms';
import { getAuthSigFromLocalStorage } from '@/utils/app';

export const useLitAuthSigExpirationCheck = () => {
  const setAuthSigExpiration = useSetAtom(authSigExpiredAtom);

  return useQuery({
    queryKey: ['authSigExpirationCheck'],
    queryFn: () => {
      const authSig = getAuthSigFromLocalStorage();
      if (!authSig) {
        console.log('No AuthSig found in local storage');
        setAuthSigExpiration(true);
        return { status: 'missing' as const };
      }

      const isExpired = checkAuthSigExpiration(authSig);

      if (isExpired) {
        console.log('AuthSig is expired');
        setAuthSigExpiration(true);
        return { status: 'expired' as const };
      }

      console.log('AuthSig is valid');
      setAuthSigExpiration(false);
      return { status: 'valid' as const };
    },
    retry: false,
    refetchInterval: 60000, // Check every minute
  });
};

function checkAuthSigExpiration(authSig: any): boolean {
  if (!authSig || !authSig.signedMessage) {
    console.log('Invalid AuthSig format');
    return true; // Treat as expired if we don't have a valid AuthSig
  }

  // Parse the signedMessage to extract the expiration time
  const expirationMatch = authSig.signedMessage.match(/Expiration Time: (.+)Z/);
  if (!expirationMatch) {
    console.log('No expiration time found in AuthSig');
    return true; // Treat as expired if we can't find the expiration time
  }

  const expirationTime = new Date(expirationMatch[1]).getTime();
  const currentTime = Date.now();

  console.log(`AuthSig expires at: ${new Date(expirationTime)}`);
  console.log(`Current time: ${new Date(currentTime)}`);

  return currentTime >= expirationTime;
}

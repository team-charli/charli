import { useState } from 'react';
import ky from 'ky';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP,  } from '@lit-protocol/types';
import { isJwtExpired } from '../../utils/app';
import { NonceData } from '../../types/types';
import { usePkpWallet } from '@/contexts/PkpWalletContext';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null) {
  const [userJWT, setUserJWT] = useLocalStorage<string | null>("userJWT");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { pkpWallet } = usePkpWallet();

  const authenticateAndFetchJWT = async () => {
    setIsLoading(true);
    try {
      if (pkpWallet && currentAccount && (userJWT === null || isJwtExpired(userJWT))) {
        // Fetch new nonce
        const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
        const nonce = nonceResponse.nonce;

        // Use the nonce to sign a message and fetch a new JWT
        const signature = await pkpWallet.signMessage(nonce);
        const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
          json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
        }).json<{ token: string }>();

        if (jwtResponse.token) {
          setUserJWT(jwtResponse.token);
        } else {
          console.error("failed to set jwt")
        }
      }
    } catch (e) {
      console.error("Error fetching JWT", e);
      setError(e instanceof Error ? e : new Error('An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return { userJWT, isLoading, error, authenticateAndFetchJWT };
}

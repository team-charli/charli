import { useEffect, useState } from 'react';
import ky from 'ky';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { isJwtExpired } from '../../utils/app';
import { NonceData } from '../../types/types';
import { useAuthOnboardContext } from '@/contexts';
import { usePkpWallet } from '@/contexts/PkpWalletContext';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null) {
  const [userJWT, setUserJWT] = useLocalStorage<string | null>("userJWT");
  const [nonce, setNonce] = useState<string | null>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const context = useAuthOnboardContext();
  const {pkpWallet} = usePkpWallet();
  useEffect(() => {
    if (userJWT && isJwtExpired(userJWT)) {
      setUserJWT(null);
    }
  }, [userJWT]);

  useEffect(() => {
    let isMounted = true;

    const authenticateAndFetchJWT = async (currentNonce: string | null) => {
      setIsLoading(true);
      try {
        if (pkpWallet && currentAccount && (userJWT === null || isJwtExpired(userJWT) || currentNonce === null)) {
          // Fetch new nonce
          // Use the nonce to sign a message and fetch a new JWT
          let nonceResponse;
          try {
            nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
            setNonce(nonceResponse.nonce);
            currentNonce = nonceResponse.nonce;
          } catch (e) {
            console.error(e);
            throw new Error(`error fetching nonce:`);
          }

          let signature;
          try {
            signature = await pkpWallet.signMessage(nonceResponse.nonce);
          } catch (e) {
            console.error("problem signing nonce", e);
            throw new Error('problem signing');
          }
          let jwtResponse;
          try {
            console.log('run jwt request');
            jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
              json: { ethereumAddress: currentAccount.ethAddress, signature, nonce: nonceResponse.nonce },
            }).json<{ token: string }>();
            setUserJWT(jwtResponse.token);
          } catch (e) {
            throw new Error(`problem with jwt request to worker: ${e}`);
          }
        }
      } catch (e) {
        console.error("Error final catch", e);
        const errorInstance = e instanceof Error ? e : new Error('An unknown error occurred');
        if (isMounted) {
          setError(errorInstance);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void (async () => {
      await authenticateAndFetchJWT(nonce);
    })();

    return () => {
      isMounted = false;
    };
  }, [currentAccount, sessionSigs, userJWT]);

  return { userJWT, nonce, isLoading, error };
}

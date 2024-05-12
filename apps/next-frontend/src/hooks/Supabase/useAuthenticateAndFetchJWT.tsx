import { useEffect, useState } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import ky from 'ky';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { isJwtExpired } from '../../utils/app';
import { NonceData } from '../../types/types';
import { useAuthOnboardContext } from '@/contexts';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null) {
  const [userJWT, setUserJWT] = useLocalStorage<string | null>("userJWT");
  const [nonce, setNonce] = useState<string | null>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const context = useAuthOnboardContext();

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
        if (context?.isLitLoggedIn && sessionSigs && currentAccount && (userJWT === null || isJwtExpired(userJWT) || currentNonce === null)) {
          // Fetch new nonce
          let nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce')
            .json<NonceData>()
            .catch(e => {
              console.error("Error fetching nonce", e);
              throw new Error(`Error fetching nonce: ${e}`);
            });

          if (nonceResponse) {
            console.log('setNonce');
            setNonce(nonceResponse.nonce);
            currentNonce = nonceResponse.nonce;
          } else {
            console.log("setNonce failed");
          }

          // Use the nonce to sign a message and fetch a new JWT
          let pkpWallet = new PKPEthersWallet({
            controllerSessionSigs: sessionSigs,
            pkpPubKey: currentAccount.publicKey,
          });

          await pkpWallet?.init().catch(e => console.error("pkpWallet.init", e));

          if (!nonceResponse?.nonce) throw new Error("no response on nonce");

          let signature = await pkpWallet?.signMessage(nonceResponse.nonce).catch(e => console.error("problem signing nonce", e));

          console.log('run jwt request');
          let jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
            json: { ethereumAddress: currentAccount.ethAddress, signature, nonce: nonceResponse.nonce },
          })
            .json<{ token: string }>()
            .catch(e => {
              console.error('problem with jwt request to worker', e);
              return null; // Return null if an error occurs
            });

          if (jwtResponse && jwtResponse.token) {
            const token = jwtResponse.token;
            setUserJWT(token);
          } else {
            console.error('Invalid JWT response');
            // Handle the case when the JWT response is invalid or missing the token
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

  return { cachedJWT: userJWT, nonce, isLoading, error };
}

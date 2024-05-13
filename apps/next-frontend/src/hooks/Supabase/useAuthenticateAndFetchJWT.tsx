import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import ky from 'ky';
import { useLocalStorage } from '@rehooks/local-storage';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { isJwtExpired } from '../../utils/app';
import { NonceData } from '../../types/types';
import { useAuthOnboardContext } from '@/contexts';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null) {
  const [userJWT, setUserJWT] = useLocalStorage<string | null>("userJWT");
  const [nonce, setNonce] = useState<string | null>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const context = useAuthOnboardContext();
  const [authMethod] = useLocalStorage<AuthMethod | null>("authMethod");
  const [litLess] = useLocalStorage<boolean>("litLess");

  useEffect(() => {
    if (userJWT && isJwtExpired(userJWT)) {
      setUserJWT(null);
    }
  }, [userJWT]);

  useEffect(() => {
    let isMounted = true;
    let currentNonce: string | null = null;

    const authenticateAndFetchJWT = async () => {
      setIsLoading(true);
      try {
        if (context?.isLitLoggedIn && currentAccount && sessionSigs && (userJWT === null || isJwtExpired(userJWT) || currentNonce === null)) {
          // Fetch new nonce
          const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce')
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
          const pkpWallet = new PKPEthersWallet({
            controllerSessionSigs: sessionSigs,
            pkpPubKey: currentAccount.publicKey,
          });

          await pkpWallet?.init().catch(e => console.error("pkpWallet.init", e));

          if (!currentNonce) throw new Error("no response on nonce");

          let signature;
          try {
            signature = await pkpWallet?.signMessage(currentNonce);
          } catch (e) {
            console.error("problem signing nonce with pkpWallet, falling back to litLessWallet", e);
            const litLessPrivateKey = process.env.NEXT_PUBLIC_LITLESS_PRIVATE_KEY;
            if (!litLessPrivateKey) throw new Error('problem importing NEXT_PUBLIC_LITLESS_PRIVATE_KEY');
            console.log("LITLESS MODE");
            const litLessWallet = new ethers.Wallet(litLessPrivateKey);
            signature = await litLessWallet.signMessage(currentNonce).catch(e => console.error("problem signing nonce with litLessWallet", e));
          }

          console.log('run jwt request');
          const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
            json: { ethereumAddress: currentAccount.ethAddress, signature, nonce: currentNonce },
          })
          .json<{ token: string }>()
          .catch(e => {
            console.error('problem with jwt request to worker', e);
            throw e;
          });

          if (jwtResponse && jwtResponse.token) {
            const token = jwtResponse.token;
            setUserJWT(token);
          } else {
            console.error('Invalid JWT response');
            // Handle the case when the JWT response is invalid or missing the token
          }
        } else if (litLess) {
          await litLessFetchJwt();
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

    const litLessFetchJwt = async () => {
      try {
        // Fetch new nonce
        const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce')
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

        const litLessPrivateKey = process.env.NEXT_PUBLIC_LITLESS_PRIVATE_KEY;
        if (!litLessPrivateKey) throw new Error('problem importing NEXT_PUBLIC_LITLESS_PRIVATE_KEY');
          console.log("LITLESS MODE");
        const litLessWallet = new ethers.Wallet(litLessPrivateKey);

        // Use the nonce to sign a message and fetch a new JWT
        if (!currentNonce) throw new Error("no response on nonce");

        const signature = await litLessWallet.signMessage(currentNonce).catch(e => console.error("problem signing nonce", e));

        console.log('run jwt request');
        const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
          json: { ethereumAddress: litLessWallet.address, signature, nonce: currentNonce },
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
      } catch (e) {
        console.error("Error in litLessFetchJwt", e);
        const errorInstance = e instanceof Error ? e : new Error('An unknown error occurred');
        if (isMounted) {
          setError(errorInstance);
        }
      }
    };

    void (async () => {
      await authenticateAndFetchJWT();
    })();

    return () => {
      isMounted = false;
    };
  }, [sessionSigs, authMethod, userJWT]);

  return { cachedJWT: userJWT, nonce, isLoading, error };
}

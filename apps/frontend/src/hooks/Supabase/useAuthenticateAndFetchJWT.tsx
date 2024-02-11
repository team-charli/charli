import { useEffect, useState } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import ky from 'ky';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { isJwtExpired } from '../../utils/app';
import { NonceData } from '../../types/types';
import { useNetwork } from '../../contexts/NetworkContext';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null) {
  const [cachedJWT, setCachedJWT] = useLocalStorage<string | null>("userJWT");
  const [nonce, setNonce] = useState<string | null>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const {isOnline} = useNetwork();

  useEffect(() => {
    if(cachedJWT && isJwtExpired(cachedJWT)) setCachedJWT(null)
  }, [])

  useEffect(() => {
    const authenticateAndFetchJWT = async () => {
      setIsLoading(true);
      try {
        // Check if we need to fetch a new nonce and JWT
        if (currentAccount && sessionSigs && isOnline && (cachedJWT === null || isJwtExpired(cachedJWT) || nonce === null)) {

          // Fetch new nonce
          const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
          setNonce(nonceResponse.nonce);

          // Use the nonce to sign a message and fetch a new JWT
          const pkpWallet = new PKPEthersWallet({
            controllerSessionSigs: sessionSigs,
            pkpPubKey: currentAccount.publicKey,
            debug: true
          });
          await pkpWallet.init();
          const signature = await pkpWallet.signMessage(nonceResponse.nonce);
          const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
            json: { ethereumAddress: currentAccount.ethAddress, signature, nonce: nonceResponse.nonce },
          }).json<{ token: string }>();
          setCachedJWT(jwtResponse.token);
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    authenticateAndFetchJWT();
  }, [currentAccount, sessionSigs, cachedJWT, nonce]);

  return { cachedJWT, nonce, isLoading, error };
}


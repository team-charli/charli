import { useEffect, useState } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import ky from 'ky';
import { useLocalStorage } from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { isJwtExpired } from '../../utils/app';
import { NonceData } from '../../types/types';
import { useNetwork } from '../../contexts/NetworkContext';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null) {
  const [userJWT, setUserJWT] = useLocalStorage<string | null>("userJWT");
  const [nonce, setNonce] = useState<string | null>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [debugRequestCount, setDebugRequestCount] = useState<number>(0)
  // const {isOnline} = useNetwork();

 useEffect(() => {
    if (debugRequestCount > 1) {
      console.log("debugRequestCount",debugRequestCount)
      }
  }, [debugRequestCount])

  useEffect(() => {
    if(userJWT && isJwtExpired(userJWT)) setUserJWT(null)
  }, [])

  useEffect(() => {
    const authenticateAndFetchJWT = async () => {
      setIsLoading(true);
      try {
        //TODO: if !currentAccount || !sessionSigs
        if (currentAccount && sessionSigs /*&& isOnline */&& (userJWT === null || isJwtExpired(userJWT) || nonce === null)) {

          // Fetch new nonce
          let nonceResponse
          try {
            setDebugRequestCount(prevCount => prevCount + 1)
            nonceResponse= await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
            setNonce(nonceResponse.nonce);
          } catch(e) {
            throw new Error(`error fetching nonce: ${e}`)
          }
          // Use the nonce to sign a message and fetch a new JWT
          const pkpWallet = new PKPEthersWallet({
            controllerSessionSigs: sessionSigs,
            pkpPubKey: currentAccount.publicKey,
            debug: true
          });
          try {
            await pkpWallet.init();
          } catch (e) {
            throw new Error(`error initializing pkpWallet: ${e}`)
          }
          let signature
          try {
            signature= await pkpWallet.signMessage(nonceResponse.nonce);
          } catch(e) {
            throw new Error(`problem signing: ${e}`)
          }
          let jwtResponse
          try {
            jwtResponse= await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
              json: { ethereumAddress: currentAccount.ethAddress, signature, nonce: nonceResponse.nonce },
            }).json<{ token: string }>();
            setUserJWT(jwtResponse.token);
          } catch(e) {
            throw new Error(`problem with jwt request to worker: ${e}`)
          }
        }
      } catch (e) {
          const errorInstance = e instanceof Error ? e : new Error('An unknown error occurred');
          setError(errorInstance);
          throw errorInstance; // Rethrow the error instance directly
      } finally {
        setIsLoading(false);
      }
    };

    authenticateAndFetchJWT();
  }, [currentAccount, sessionSigs, userJWT, nonce]);

  return { cachedJWT: userJWT, nonce, isLoading, error };
}
//TODO:  determine behavior of app if it's been sitting idle and various tokens expire
//for instance: jwt === null in local-storage and not fetching new token because
// !currentAccount && !sessionSigs.  Those need to be addressed too and considered in the larger issue of how to handle a return from idle state.
// those can be grouped into something like isLitOnline, along with a new isSuperbaseOnline, to consolidate app state for overall idle state handling
// this prevents you from having to check currentAccount and sessionSigs in places where they're not directly used

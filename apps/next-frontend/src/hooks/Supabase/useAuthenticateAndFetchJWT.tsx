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
  // const [debugRequestCount, setDebugRequestCount] = useState<number>(0)
  // const {isOnline} = useNetwork();
  // useEffect(() => {
  // console.log('nonce', nonce)
  //    if (debugRequestCount > 1) {
  //      console.log("debugRequestCount",debugRequestCount)
  //      }
  // }, [nonce])

  useEffect(() => {
    if(userJWT && isJwtExpired(userJWT)) setUserJWT(null)
  }, [setUserJWT, userJWT ])

  useEffect(() => {
    const authenticateAndFetchJWT = async () => {
      // console.warn({isJwtExpired:  userJWT && isJwtExpired(userJWT), currentAccount:Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), userJWT: userJWT })
      setIsLoading(true);
      try {
        if (context?.isLitLoggedIn && sessionSigs && currentAccount && (userJWT === null || isJwtExpired(userJWT) || nonce === null)) {
          // Fetch new nonce
          let nonceResponse
          try {
            // setDebugRequestCount(prevCount => prevCount + 1)
            nonceResponse= await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
            setNonce(nonceResponse.nonce);
          } catch(e) {
            throw new Error(`error fetching nonce: ${e}`)
          }
          // Use the nonce to sign a message and fetch a new JWT
          let pkpWallet
          try {
            pkpWallet = new PKPEthersWallet({
              controllerSessionSigs: sessionSigs,
              pkpPubKey: currentAccount.publicKey,
              // debug: true
            });
          } catch(e) {
            console.error("new PKPEthersWallet", e)
            throw new Error(`Wallet Constructor: ${e}`)
          }
          try {
            // 401 is still a question of bad sigs I think
            await pkpWallet.init();
          } catch (e) {
            console.error("pkpWallet.init", e)
            throw new Error(`error initializing pkpWallet`)
          }
          let signature
          try {
            signature= await pkpWallet.signMessage(nonceResponse.nonce);
          } catch(e) {
            console.error(e)
            throw new Error('problem signing')
          }
          let jwtResponse
          try {
            console.log('run jwt request')
            jwtResponse= await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
              json: { ethereumAddress: currentAccount.ethAddress, signature, nonce: nonceResponse.nonce },
            }).json<{ token: string }>();
            setUserJWT(jwtResponse.token);
          } catch(e) {
            throw new Error(`problem with jwt request to worker: ${e}`)
          }
        }
      } catch (e) {
        console.error("Error final catch", e)
        const errorInstance = e instanceof Error ? e : new Error('An unknown error occurred');
        setError(errorInstance);
        throw errorInstance; // Rethrow the error instance directly
      } finally {
        setIsLoading(false);
      }
    };

    void (async () => {
      await authenticateAndFetchJWT();
    })();
  }, [currentAccount, sessionSigs, nonce, setUserJWT, userJWT]);

  return { cachedJWT: userJWT, nonce, isLoading, error };
}
//TODO:  determine behavior of app if it's been sitting idle and various tokens expire
//for instance: jwt === null in local-storage and not fetching new token because
// !currentAccount && !sessionSigs.  Those need to be addressed too and considered in the larger issue of how to handle a return from idle state.
// those can be grouped into something like isLitOnline, along with a new isSuperbaseOnline, to consolidate app state for overall idle state handling
// this prevents you from having to check currentAccount and sessionSigs in places where they're not directly used

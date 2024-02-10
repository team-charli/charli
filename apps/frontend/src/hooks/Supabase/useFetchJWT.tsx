import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from '../utils/useAsyncEffect';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../../types/types';
import { isJwtExpired } from '../../utils/app';

export function useFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, nonce: string | null, setCachedJWT: LocalStorageSetter<string>, cachedJWT: string | null ) {
  const fetchJWT = async () => {
    // console.log('useFetchJWT', {nonce, currentAccount, sessionSigs, cachedJWT});

    if (nonce && currentAccount && sessionSigs && (cachedJWT === null || Object.keys(cachedJWT).length === 0 || isJwtExpired(cachedJWT))) {
      console.log("fetching jwt");
      const ethereumAddress = currentAccount.ethAddress;
      const pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
        debug: true
      });

      try {
        await pkpWallet.init();
      } catch(e) {
        const error = e as Error;
        console.error(`pkpWallet.init failed: `, error)
      }
      let signature
      try {
       signature = await pkpWallet.signMessage(nonce);

      } catch (e) {
        const error = e as Error;
        console.error(`pkpWallet.signMessage failed: `, error)
      }

      let response
      try {
        response = await fetch('https://supabase-auth.zach-greco.workers.dev/jwt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ethereumAddress, signature, nonce }),
        });
      } catch (e) {
        const error = e as Error;
        console.error(`fetchJWT failed: `, error)
      }
      if (!response?.ok) {
        throw new Error(`fetchJWT failed HTTP error status: ${response?.status}`);
      }
      let data
      try {
        data = await response.json();
        if (data.token) {
          console.log("set userJWT")
          setCachedJWT(data.token);
        }
      } catch(e) {

        const error = e as Error;
        console.error(`fetchJWT failed: `, error)
      }
    }
  };

  const { error, isLoading } = useAsyncEffect(fetchJWT, async () => { }, [nonce, currentAccount, sessionSigs]);

  return { loading: isLoading, error };
}
//NOTE: may have to implement expiration checks/refetch

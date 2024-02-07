import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from '../utils/useAsyncEffect';
import { IRelayPKP, SessionSigs, AuthSig } from '@lit-protocol/types';
import { LocalStorageSetter } from '../../types/types';

export function useFetchJWT(currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null ,nonce: string | null, setCachedJWT: LocalStorageSetter<string>, cachedJWT: string | null ) {
  const fetchJWT = async () => {
    if (nonce && currentAccount && sessionSigs && !cachedJWT) {
      console.log("fetching jwt");
      const ethereumAddress = currentAccount.ethAddress;
      const pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
      });

      try {
      await pkpWallet.init();

      const signature = await pkpWallet.signMessage(nonce);

      const response = await fetch('https://supabase-auth.zach-greco.workers.dev/jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ethereumAddress, signature, nonce }),
      });
      if (!response.ok) {
        throw new Error(`fetchJWT failed HTTP error status: ${response.status}`);
      }
      const data = await response.json();
      setCachedJWT(data.token);
      } catch(e) {
        console.log(`fetchJWT failed: ${e}`)
      }
    }
  };

  const { error, isLoading } = useAsyncEffect(fetchJWT, async () => { }, [nonce, currentAccount, sessionSigs]);

  return { loading: isLoading, error };
}

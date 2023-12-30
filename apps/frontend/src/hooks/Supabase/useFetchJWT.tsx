import { useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useContextNullCheck } from '../utils/useContextNullCheck';
import { useFetchNonce } from './useFetchNonce';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { getStorage } from '../../utils/app'
export function useFetchJWT() {
  const { currentAccount, sessionSigs, updateJwt } = useContextNullCheck(AuthContext);
  const caLS = getStorage('currentAccount')
  const ssLS = getStorage('sessionSigs')
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const nonce = useFetchNonce()

  useEffect(() => {
    async function fetchJWT() {

      if (nonce && (currentAccount || caLS) && (sessionSigs || ssLS)) {
        console.log('trying fetchJWT');
        setLoading(true);
        const ethereumAddress = currentAccount.ethAddress;
        const pkpWallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
        });
        await pkpWallet.init();

        const signature = await pkpWallet.signMessage(nonce);

        try {
          const response = await fetch('https://supabase-auth.zach-greco.workers.dev/jwt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ethereumAddress, signature, nonce }),
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          updateJwt(data.token);
          localStorage.setItem('userJWT', data.token);
        } catch (e) {
          setError(e as Error);
        } finally {
          setLoading(false);
        }
      } else {
        console.log(`failed fetch jwt; nonce: ${nonce}; currentAccount: ${currentAccount}; caLS: ${caLS}; sessionSigs: ${sessionSigs}; ssLS ${ssLS}) `)
      }
    }
    fetchJWT();
  }, [nonce ]); // Dependency on contextCurrentAccount

  return { loading, error };
}

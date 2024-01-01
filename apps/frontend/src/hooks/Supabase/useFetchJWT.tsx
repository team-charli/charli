import { useState, useEffect } from 'react';
import { useFetchNonce } from './useFetchNonce';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { getStorage } from '../../utils/app';
import { useAsyncEffect } from '../utils/useAsyncEffect';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

export function useFetchJWT() {
    const [currentAccount, setCurrentAccount] = useState<IRelayPKP | null>(null);
    const [sessionSigs, setSessionSigs] = useState<SessionSigs | null>(null);

    useEffect(() => {
        const storedCurrentAccount = localStorage.getItem('currentAccount');
        const storedSessionSigs = localStorage.getItem('sessionSigs');
        setCurrentAccount(storedCurrentAccount ? JSON.parse(storedCurrentAccount) : null);
        setSessionSigs(storedSessionSigs ? JSON.parse(storedSessionSigs) : null);
    }, []);

    const nonce = useFetchNonce(currentAccount, sessionSigs);

  useEffect(() => {
    console.log("nonce", nonce)
  }, [nonce])

    const fetchJWT = async () => {
        if (nonce && currentAccount && sessionSigs) {
            const authSig = getStorage("lit-wallet-sig");
            const ethereumAddress = currentAccount.ethAddress;
            const pkpWallet = new PKPEthersWallet({
                controllerAuthSig: authSig,
                pkpPubKey: currentAccount.publicKey,
            });
            await pkpWallet.init();

            const signature = await pkpWallet.signMessage(nonce);
            const response = await fetch('https://supabase-auth.zach-greco.workers.dev/jwt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ethereumAddress, signature, nonce }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            localStorage.setItem('userJWT', data.token);
        }
    };

    const { error, isLoading } = useAsyncEffect(fetchJWT, async () => { /* Unmount logic here */ }, [nonce, currentAccount, sessionSigs]);

    return { loading: isLoading, error };
}

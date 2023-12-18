import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { ethers } from 'ethers';
import { useState } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from '../../utils/useAsyncEffect';
import { useContextNullCheck } from '../../utils/useContextNullCheck';
import { AuthContext } from 'apps/frontend/src/contexts/AuthContext';

export const useIsAuthenticated = ({currentAccount, sessionSigs}:{currentAccount: IRelayPKP | undefined, sessionSigs: SessionSigs | undefined} ): boolean => {
  const [message, /*setMessage*/] = useState<string>('Free the web!');
  const [/*signature*/, setSignature] = useState<string>();
  const [/*recoveredAddress*/, setRecoveredAddress] = useState<string>();
  const [verified, setVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();
  // console.log(`loaded useIsAuthenticated; currentAccount == ${currentAccount} sessionSigs == ${sessionSigs}`)
 const _currentAccount = localStorage.getItem('lit-wallet-sig')
  useAsyncEffect( async () => {
    setLoading(true);
    if (currentAccount && sessionSigs) {
      try {
        console.log('running test tx')
        const pkpWallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
        });
        await pkpWallet.init();

        const signature = await pkpWallet.signMessage(message);
        setSignature(signature);

        // Get the address associated with the signature created by signing the message
        const recoveredAddr = ethers.utils.verifyMessage(message, signature);
        setRecoveredAddress(recoveredAddr);

        // Check if the address associated with the signature is the same as the current PKP
        const verified =
          currentAccount.ethAddress.toLowerCase() === recoveredAddr.toLowerCase();
        setVerified(verified);
      } catch (err) {
        console.error(err);
        setError(err as Error);
      }
      setLoading(false);
    }
  }
    ,
    async () => Promise.resolve(),
    [sessionSigs, currentAccount]
  )
  if (verified) {
    return true
  } else {
   return false
  }
}

//NOTE: SIWE an possible alternative to this

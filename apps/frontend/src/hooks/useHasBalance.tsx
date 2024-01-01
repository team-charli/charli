import { useState } from 'react'
import {utils} from 'ethers'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from './utils/useAsyncEffect';
import { loadAccountAndSessionKeys } from '../utils/app';

export function useHasBalance() {
  const [hasBalance, setHasBalance] = useState(false);

  useAsyncEffect( async () => {
    const {currentAccount, sessionSigs} = loadAccountAndSessionKeys();
    if (currentAccount && sessionSigs) {
      const pkpWallet = new PKPEthersWallet({
        pkpPubKey: currentAccount.publicKey,
        controllerSessionSigs: sessionSigs,
      });

      await pkpWallet.init()
      const minBalanceWei = utils.parseEther('0.003259948275487362')
      const balance =  await pkpWallet.getBalance(currentAccount.ethAddress)
      console.log({balance})
      if (balance.gt(minBalanceWei)) {
        setHasBalance(true);
      }
    }
  },
    async () => Promise.resolve(),
    []
  )

  return hasBalance
}

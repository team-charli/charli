import {utils} from 'ethers'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from './utils/useAsyncEffect';
import { useAuthContext } from '../contexts/AuthContext';
import { LocalStorageSetter } from '../types/types';

export function useHasBalance(hasBalance: boolean | null, setHasBalance:LocalStorageSetter<boolean> ) {
  const {currentAccount, sessionSigs} = useAuthContext();

  useAsyncEffect( async () => {
    if (currentAccount && sessionSigs && hasBalance === null) {
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
    [hasBalance, currentAccount, sessionSigs]
  )

  return hasBalance
}

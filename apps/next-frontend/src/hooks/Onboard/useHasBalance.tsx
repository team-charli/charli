import { ethers } from 'ethers'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { LocalStorageSetter } from '../../types/types';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useEffect } from 'react';

export function useHasBalance(isOnboarded: boolean | null, hasBalance: boolean | null, setHasBalance:LocalStorageSetter<boolean> ) {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount')
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  useEffect(() => {
    void (async () => {
      if (isOnboarded && currentAccount && sessionSigs && hasBalance === null) {
        let pkpWallet
        try {
          pkpWallet = new PKPEthersWallet({
            pkpPubKey: currentAccount.publicKey,
            controllerSessionSigs: sessionSigs,
          });
        } catch (e) {
          console.error(e);
          throw new Error()
        }
        try {
          await pkpWallet.init()
        } catch (e) {
          console.error(e)
          throw new Error;
        }
        const minBalanceWei = ethers.parseEther('0.003259948275487362')

        let balance
        try {
          balance =  await pkpWallet.getBalance(currentAccount.ethAddress)
          console.log('balance', balance);
        } catch(e) {
          const error = e as Response
          console.log(error.json())
        }
        if (balance?.gt(minBalanceWei)) {
          console.log('setHasBalance(true)');
          setHasBalance(true);
        } else {
          console.log('setHasBalance(false)');
          setHasBalance(false);
        }
      }
    })();
  },
    [hasBalance, currentAccount, sessionSigs]
  )

  return hasBalance
}

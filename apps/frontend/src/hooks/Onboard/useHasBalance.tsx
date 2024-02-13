import {utils} from 'ethers'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from '../utils/useAsyncEffect';
import { LocalStorageSetter } from '../../types/types';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useNetwork } from '../../contexts/NetworkContext';

export function useHasBalance(hasBalance: boolean | null, setHasBalance:LocalStorageSetter<boolean> ) {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount')
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  // const { isOnline } = useNetwork();
  useAsyncEffect( async () => {
    if (currentAccount && sessionSigs /*&& isOnline*/ && hasBalance === null) {

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
      const minBalanceWei = utils.parseEther('0.003259948275487362')

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
  },
    async () => Promise.resolve(),
    [hasBalance, currentAccount, sessionSigs]
  )

  return hasBalance
}

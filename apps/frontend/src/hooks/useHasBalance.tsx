import {useState, useEffect, useContext} from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from './utils/useAsyncEffect';

export function useHasBalance() {
  const authContext = useContext(AuthContext);

  const [hasBalance, setHasBalance] = useState(false)
  const [address, setAddress] = useState<`0x${string}`| undefined>(undefined)

  useAsyncEffect( async () => {
    if (authContext?.currentAccount && authContext?.sessionSigs) {
      const pkpWallet = new PKPEthersWallet({
        pkpPubKey: authContext.currentAccount.publicKey,
        controllerSessionSigs: authContext.sessionSigs,
      });

      await pkpWallet.init()
      const balance =  await pkpWallet.getBalance(authContext.currentAccount.ethAddress)
      console.log({balance})
    }
  },
    async () => Promise.resolve(),

    [authContext?.currentAccount, authContext?.sessionSigs]
  )

  // useEffect(() => {
  //   if (currentAccount?.ethAddress) {
  //      setAddress(currentAccount.ethAddress)
  //   }

  //   const balance:BigInt = balance(address)
  //   if (balance >= 3378590000000000) {
  //   setHasBalance(true)
  // }
  // })

  return hasBalance
}
    //TODO: check balance call for submitAPI
    //TODO: app-wide ethereum transactions and calls

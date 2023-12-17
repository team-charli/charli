import {useState, useEffect, useContext} from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useAsyncEffect } from './utils/useAsyncEffect';

export function useHasBalance() {
  const authContext = useContext(AuthContext);

  const [hasBalance, setHasBalance] = useState(false)
  const [address, setAddress] = useState<`0x${string}`| undefined>(undefined)

  useAsyncEffect( async () => {
    if (authContext?.contextCurrentAccount && authContext?.contextSessionSigs) {
      const pkpWallet = new PKPEthersWallet({
        pkpPubKey: authContext.contextCurrentAccount.publicKey,
        controllerSessionSigs: authContext.contextSessionSigs,
      });

      await pkpWallet.init()
      const balance =  await pkpWallet.getBalance(authContext.contextCurrentAccount.ethAddress)
      console.log({balance})
    }
  },
    async () => Promise.resolve(),

    [authContext?.contextCurrentAccount, authContext?.contextSessionSigs]
  )

  // useEffect(() => {
  //   if (contextCurrentAccount?.ethAddress) {
  //      setAddress(contextCurrentAccount.ethAddress)
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

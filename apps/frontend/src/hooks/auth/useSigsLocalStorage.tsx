import { IRelayPKP, SessionSigs } from '@lit-protocol/types'
import {useState, useEffect} from 'react'
export const useSigsLocalStorage = ({currentAccount, sessionSigs}: {currentAccount: IRelayPKP | undefined, sessionSigs: SessionSigs | undefined}) => {
const [storageCurrentAccount, setStorageCurrentAccount] = useState(null);
const [storageSessionSigs, setStorageSessionSigs] = useState(null);
  useEffect(() => {
    if (!currentAccount) {
      const walletSig = localStorage.getItem('lit-wallet-sig')
      const sessionSig = localStorage.getItem('lit-session-key')
    }

  }, [currentAccount, sessionSigs])

}

import { IRelayPKP, SessionSigs } from '@lit-protocol/types'
import {useState, useEffect} from 'react'

export const useSigsLocalStorage = ({currentAccount, sessionSigs}: {currentAccount: IRelayPKP | undefined, sessionSigs: SessionSigs | undefined}) => {
  const [storageCurrentAccount, setStorageCurrentAccount] = useState<string | null>(null);
  const [storageSessionSigs, setStorageSessionSigs] = useState<string | null>(null);
  interface SessionKey {
    publicKey: string;
    privateKey: string;
  }

  useEffect(() => {
    if (!currentAccount) {
      const walletSig = localStorage.getItem('lit-wallet-sig')

      const sessionSig = localStorage.getItem('lit-session-key')

    }
  }, [currentAccount, sessionSigs])

  useEffect(() => {
    let sessionKey = localStorage.getItem('lit-session-key');
    let accountPublicKey = localStorage.getItem('accountPubK')
    if (sessionKey) {
      const parsedSessionKey = JSON.parse(sessionKey) as SessionKey;
      if (parsedSessionKey && parsedSessionKey.publicKey.length && accountPublicKey && accountPublicKey.length) {
      setStorageCurrentAccount(accountPublicKey)

      }
    }
  }, [currentAccount, sessionSigs])


}

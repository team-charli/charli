import { useIsLitLoggedIn } from '@/hooks/Lit';
import { useAuthOboardRouting } from '@/hooks/useAuthOnboardandRouting';
import { PkpWalletContextObj, PkpWalletProviderProps } from '@/types/types';
import { litNodeClient } from '@/utils/litClients';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const PkpWalletContext = createContext<PkpWalletContextObj>({pkpWallet: null });

export const PkpWalletProvider = ({children}: PkpWalletProviderProps) => {
  const [sessionSigs] = useLocalStorage<SessionSigs>("sessionSigs");
  const [currentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const {isLitLoggedIn} = useAuthOboardRouting();
  let pkpWallet = null;
  if (sessionSigs && currentAccount && litNodeClient?.ready && isLitLoggedIn ) {
    pkpWallet = new PKPEthersWallet({
      controllerSessionSigs: sessionSigs,
      pkpPubKey: currentAccount.publicKey,
      litNodeClient
    })
    void (async () => {
      await pkpWallet.init().catch(e => {console.error(e); throw new Error("problem initializing pkpWallet")});
    })();
  }
  return (<PkpWalletContext.Provider value={{pkpWallet}}>
    {children}
  </ PkpWalletContext.Provider>
  )
}

export const usePkpWallet = () : PkpWalletContextObj => {
  const context = useContext(PkpWalletContext);
  if (!context) throw new Error('usePkpWallet must be used within a PkpWalletProvider');
  return context
}

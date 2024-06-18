// PkpWalletProvider.tsx
import React, { ReactNode, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { currentAccountAtom, litNodeClientAtom, pkpWalletAtom, sessionSigsAtom } from '@/atoms/atoms';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
interface PkpWalletProviderProps {
  children: ReactNode;
}

export const PkpWalletProvider = ({ children }: PkpWalletProviderProps) => {
  const litNodeClient = useRecoilValue(litNodeClientAtom);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount')
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const setPkpWallet = useSetRecoilState(pkpWalletAtom);

  useEffect(() => {
    const initializePkpWallet = async () => {
      if (sessionSigs && currentAccount && litNodeClient?.ready) {
        console.log("Initializing pkpWallet...");
        const wallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
          litNodeClient,
        });

        try {
          await wallet.init();
          setPkpWallet(wallet);
          console.log("pkpWallet initialized:", wallet);
        } catch (e) {
          console.error("Error initializing pkpWallet:", e);
        }
      } else {
        console.log("Conditions not met for pkpWallet initialization");
      }
    };

    initializePkpWallet();
  }, [currentAccount, litNodeClient, sessionSigs, setPkpWallet]);

  return <>{children}</>;
};

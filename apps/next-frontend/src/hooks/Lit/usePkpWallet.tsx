// PkpWalletProvider.tsx
import { useEffect, useState } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { useLitClientReady } from '@/contexts/LitClientContext';

export const usePkpWallet = () => {
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount')
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ pkpWallet, setPkpWallet ] = useState<PKPEthersWallet | null>(null);
  const { litNodeClientReady } = useLitClientReady();

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
          console.log("pkpWallet initialized:", wallet!!);
        } catch (e) {
          console.error("Error initializing pkpWallet:", e);
        }
      } else {
        // console.log("Conditions not met for pkpWallet initialization");
      }
    };

    initializePkpWallet();
  }, [litNodeClientReady , sessionSigs, currentAccount]);

  return pkpWallet;
};


import { useAtomValue, useSetAtom } from 'jotai';
import { nonceAtom, signatureAtom } from '@/atoms/atoms';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { usePkpWalletWithCheck } from '../PkpWallet/usePkpWalletWithCheck';

export const useSignature = () => {
  const nonce = useAtomValue(nonceAtom);
  const setSignature = useSetAtom(signatureAtom);

  // console.log("useSignature: nonce available", !!nonce);

  return usePkpWalletWithCheck(
    ['signature', nonce] as const,
    async (pkpWallet: PKPEthersWallet): Promise<string> => {
      // console.log("6a: start signature query");

      if (!nonce) throw new Error('Nonce not available');

      try {
        const signature = await pkpWallet.signMessage(nonce);

        console.log("Signature generated successfully");

        setSignature(signature);

        // console.log(`6b: signature query finish`);

        return signature;

      } catch (error) {
        console.error("Error in signature generation:", error);
        throw error;
      }
    },
    {
      enabled: !!nonce,
    }
  );
};

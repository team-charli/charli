import { UseQueryResult } from '@tanstack/react-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useNonce } from './useNonce';
import { usePkpWalletWithCheck } from '../PkpWallet/usePkpWalletWithCheck';

export const useSignature = (): UseQueryResult<string, Error> => {
  const { data: nonce } = useNonce();

  return usePkpWalletWithCheck(
    ['signature', nonce] as const,
    async (pkpWallet: PKPEthersWallet  | undefined): Promise<string> => {
      console.log("useSignature query run")
      if (!nonce || typeof nonce !== 'string') {
        throw new Error('Nonce not available or invalid');
      }
      if (!pkpWallet) throw new Error("pkpWallet not available")
      try {
        const signature = await pkpWallet.signMessage(nonce);
        console.log("Signature generated successfully");
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

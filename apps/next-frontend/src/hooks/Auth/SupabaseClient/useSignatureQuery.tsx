//useSignatureQuery.tsx
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

interface SignatureQueryParams {
  queryKey: [string, string];
  enabledDeps: boolean;
  queryFnData: [string | undefined | Error, PKPEthersWallet | null | undefined]
}

export const useSignatureQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
}: SignatureQueryParams): UseQueryResult<string, Error> => {

  return useQuery({
    queryKey,
    queryFn: async (): Promise<string> => {
      const [nonce, pkpWallet] = queryFnData;

      if (!pkpWallet) {
        throw new Error('PKP Wallet is undefined or null');
      }
      if (typeof nonce !== 'string') {
        throw new Error('nonce not a string')
      }

      if (typeof pkpWallet.signMessage !== 'function') {
        throw new Error(`signMessage is not a function. PKP Wallet type: ${typeof pkpWallet}`);
      }
      try {
        const signature = await pkpWallet.signMessage(nonce);
        console.log("8b: finish signature query -- Signature generated successfully");

        return signature;
      } catch (error) {
        console.error("Error in signature generation -- 8b: finish signature query: ", error);
        throw error;
      }
    },
    enabled: enabledDeps,

  });
};

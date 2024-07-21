//useSignatureQuery.tsx
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

interface SignatureQueryParams {
  queryKey: [string, string];
  enabledDeps: boolean;
  queryFnData: string | undefined | Error;
  pkpWallet: PKPEthersWallet | null | undefined;
}

export const useSignatureQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  pkpWallet
}: SignatureQueryParams): UseQueryResult<string, Error> => {

  return useQuery({
    queryKey,
    queryFn: async (): Promise<string> => {
      console.log("8a: start signature query");

      const nonce = queryFnData;
      if (!nonce || typeof nonce !== 'string') {
        throw new Error('8b: finish signature query -- Nonce not available or invalid');
      }
      if (!pkpWallet) throw new Error("8b: finish signature query -- pkpWallet not available")
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

//useSignatureQuery.tsx
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { usePkpWallet } from '@/contexts/AuthContext';
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
      const nonce = queryFnData;
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
    enabled: enabledDeps,

  });
};

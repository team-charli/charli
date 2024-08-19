//useSignApproveFundController.tsx
import { usePkpWallet } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { BigNumberish, ethers } from "ethers";

type UseSignApproveFundControllerArgs = {
  contractAddress: string | undefined,
  spenderAddress: string,
  amount: BigNumberish | null
}

export const useSignApproveFundController = () => {
  const {data: pkpWallet} = usePkpWallet();

  return useMutation({
    mutationFn: async ({contractAddress, spenderAddress, amount}: UseSignApproveFundControllerArgs ) => {
      if (!pkpWallet) throw new Error('pkpWallet undefined');
      if (!contractAddress) throw new Error('contractAddress undefined');
      if (!amount) throw new Error('amount undefined');

      console.log(typeof amount);
      const erc20AbiFragment = ["function approve(address spender, uint256 amount) returns (bool)"];
      const iface = new ethers.Interface(erc20AbiFragment);
      const data = iface.encodeFunctionData("approve", [spenderAddress, amount]);
      const tx = {
        to: contractAddress,
        data: data,
      };
      const signedTx = await pkpWallet.signTransaction(tx);
      console.log("Signed Approve transaction:", signedTx);
      return signedTx;
    },
    retry: 3, // Set the maximum number of retries
    retryDelay: (attemptIndex) => 1000 * 2 ** attemptIndex, // Exponential backoff without unnecessary cap
    onError: (error, variables, context) => {
      console.error("Error in useSignApproveFundController:", error);
    }
  });
};

//useSignApproveFundController.tsx
import { usePkpWallet } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { ethers } from "ethers";

type UseSignApproveFundControllerArgs = {
  contractAddress: string | undefined,
  spenderAddress: string,
  amount: ethers.BigNumberish | null
}

export const useSignApproveFundController = (/*{ contractAddress, spenderAddress, amount}:UseSignApproveFundControllerArgs*/) => {
  const {data: pkpWallet} = usePkpWallet();
  return useMutation({
    mutationFn: async ({contractAddress, spenderAddress, amount}: UseSignApproveFundControllerArgs ) => {
      const erc20AbiFragment = ["function approve(address spender, uint256 amount) returns (bool)"];
      const iface = new ethers.Interface(erc20AbiFragment);
      const data = iface.encodeFunctionData("approve", [spenderAddress, amount]);
      const tx = {
        to: contractAddress,
        data: data,
      };

      try {
        const signedTx = await pkpWallet.signTransaction(tx);
        console.log("Signed Approve transaction:", signedTx);
        return signedTx;
      } catch (e) {
        console.error("Problem signing transaction", e);
        throw new Error(`Problem signing transaction: ${e}`);
      }
    }
  }
  );
};

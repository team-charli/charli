import { usePkpWalletWithCheck } from "@/hooks/Auth"
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers"
import { UseQueryResult } from "@tanstack/react-query";
import { ethers } from "ethers";

export const useSignApproveFundController = (
  contractAddress: string | undefined,
  spenderAddress: string,
  amount: ethers.BigNumberish | null
): UseQueryResult<string, Error> => {
  return usePkpWalletWithCheck<string, Error>(
    ['signApproveFundController', contractAddress, spenderAddress, amount],
    async (pkpWallet: PKPEthersWallet): Promise<string> => {
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
    },
    {
      enabled: !!contractAddress && !!spenderAddress && !!amount,
    }
  );
};

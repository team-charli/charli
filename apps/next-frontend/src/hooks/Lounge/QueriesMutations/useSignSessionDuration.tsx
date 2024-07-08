import { usePkpWalletWithCheck } from "@/hooks/Auth"
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers"
import { UseQueryResult } from "@tanstack/react-query";

export const useSignSessionDuration = (sessionDuration: number): UseQueryResult<String>  => {
  return usePkpWalletWithCheck(
    [] as const,
    async (pkpWallet: PKPEthersWallet): Promise<string> => {
      try {
        return await pkpWallet.signMessage(String(sessionDuration));
      } catch (e) {
        console.error(e);
        throw new Error('failed to sign session duration')
      }
    }
  )
}

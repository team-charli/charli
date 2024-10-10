import {TransactionReceipt, TransactionResponse, ethers} from 'ethers'

type TransactionStatusObj = {
  txStatus: "reverted" | "succeeded" | "failed",
  txResponse: TransactionResponse,
}

export async function waitForTransaction(provider: ethers.Provider, txHash: string, maxTotalTime: number = 15000): Promise<TransactionStatusObj> {
  const startTime = Date.now();
  const retryDelay = 1000; // 1 second between retries

  while (Date.now() - startTime < maxTotalTime) {
    const txResponse = await provider.getTransaction(txHash);

    if (txResponse !== null) {
      console.log("Transaction found. Waiting for confirmation...");
      try {
        const txRecipet = await txResponse.wait(1);
        if (txRecipet) {
          if (txRecipet.status === 0) {
            return {txStatus: "reverted", txResponse }
          } else if (txRecipet.status === 1 ) {
            return {txStatus: "succeeded", txResponse }
          }
        } else {
          return {txStatus: "failed", txResponse }
        }
      } catch (error) {
        console.error("Error waiting for transaction confirmation:", error);
        throw new Error(`Transaction Confirmation Timed Out - hash ${txResponse.hash}  `)
      }
    }
    console.log(`Transaction not found. Retrying in ${retryDelay/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  throw new Error(`Transaction not found after ${maxTotalTime/1000} seconds`);
}


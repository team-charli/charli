import {TransactionReceipt, TransactionResponse, ethers} from 'ethers'

type TransactionStatusObj = {
  txStatus: "reverted" | "succeeded" | "failed",
  txResponse: TransactionResponse,
}

export async function waitForTransaction(provider: ethers.Provider, txHash: string, maxTotalTime: number = 15000): Promise<TransactionStatusObj> {
  // Log and validate the transaction hash being waited on
  console.log(`Starting to wait for transaction hash: "${txHash}"`);
  
  if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
    console.error(`Invalid transaction hash format: ${txHash}`);
    throw new Error(`Invalid transaction hash: ${txHash}`);
  }
  
  const startTime = Date.now();
  const retryDelay = 1000; // 1 second between retries

  while (Date.now() - startTime < maxTotalTime) {
    try {
      const txResponse = await provider.getTransaction(txHash);

      if (txResponse !== null) {
        console.log("Transaction found. Waiting for confirmation...");
        try {
          const txRecipet = await txResponse.wait(1);
          if (txRecipet) {
            if (txRecipet.status === 0) {
              console.log(`Transaction ${txHash} reverted.`);
              return {txStatus: "reverted", txResponse };
            } else if (txRecipet.status === 1 ) {
              console.log(`Transaction ${txHash} succeeded.`);
              return {txStatus: "succeeded", txResponse };
            }
          } else {
            console.log(`Transaction ${txHash} failed during confirmation.`);
            return {txStatus: "failed", txResponse };
          }
        } catch (error) {
          console.error("Error waiting for transaction confirmation:", error);
          throw new Error(`Transaction Confirmation Timed Out - hash ${txResponse.hash}`);
        }
      }
      console.log(`Transaction not found. Retrying in ${retryDelay/1000} seconds...`);
    } catch (error) {
      console.error(`Error retrieving transaction ${txHash}:`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  
  console.log(`Transaction ${txHash} not found after ${maxTotalTime/1000} seconds`);
  throw new Error(`Transaction not found after ${maxTotalTime/1000} seconds`);
}


import {ethers} from 'ethers';
import {LIT_RPC} from "@lit-protocol/constants";

export async function waitForConfirmation(txHash: string, minConfirmations: number = 1) {
  const provider = new ethers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  let tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error(`Transaction ${txHash} not found`);

  // Wait for the transaction to be mined
  console.log("waiting for one mintPkp confirmations")
  await tx.wait(1);

}

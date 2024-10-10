import { AddressLike, JsonRpcProvider } from "ethers";

export async function getCorrectNonce(address: AddressLike, provider: JsonRpcProvider) {
  // Get the latest confirmed nonce
  const confirmedNonce = await provider.getTransactionCount(address, 'latest');

  // Get the pending nonce (includes unconfirmed transactions)
  const pendingNonce = await provider.getTransactionCount(address, 'pending');

  // Use the higher of the two to ensure you don't reuse a nonce
  const nonce = Math.max(confirmedNonce, pendingNonce);

  console.log(`Confirmed nonce: ${confirmedNonce}`);
  console.log(`Pending nonce: ${pendingNonce}`);
  console.log(`Nonce to use: ${nonce}`);

  return nonce;
}

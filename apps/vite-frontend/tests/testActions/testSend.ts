// @ts-nocheck
const testSend = async () => {
  const sigName = "testSend";

  // Initialize provider
  const rpcUrl = await Lit.Actions.getRpcUrl({ chain: "sepolia" });
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // Log current block number
  const blockNumber = await provider.getBlockNumber();
  console.log("Current block number:", blockNumber);

  // Get the latest gas price
  const feeData = await provider.getFeeData();
  console.log("Current fee data:", JSON.stringify(feeData, null, 2));

  // Create unsigned transaction with updated gas prices, without nonce
  let unsignedTransaction = {
    from: "0x7A0AC1BB54CA4132Ecb59c523D57Dd32ad04B6aF", // Add this line
    to,
    type: 2,
    value,
    maxFeePerGas: feeData.maxFeePerGas.mul(120).div(100), // Increase by 20%
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.mul(120).div(100), // Increase by 20%
    chainId: 11155111,
    gasLimit: ethers.BigNumber.from(21000)
  };

  const serializedTx = ethers.utils.serializeTransaction(unsignedTransaction);
  const toSign = ethers.utils.arrayify(ethers.utils.keccak256(serializedTx));

  // Sign the transaction
  const signature = await Lit.Actions.signAndCombineEcdsa({
    toSign,
    publicKey,
    sigName,
  });

  const jsonSignature = JSON.parse(signature);
  jsonSignature.r = "0x" + jsonSignature.r.substring(2);
  jsonSignature.s = "0x" + jsonSignature.s;
  const hexSignature = ethers.utils.joinSignature(jsonSignature);

  // Verify signature
  const verifiedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(toSign), hexSignature);
  console.log("Verified signer address:", verifiedAddress);

  // Recover the address
  const recoveredAddress = ethers.utils.recoverAddress(toSign, hexSignature);
  console.log("Recovered Address:", recoveredAddress);

  // Verify PKP Address
  const expectedPKPAddress = ethers.utils.computeAddress('0x' + publicKey);
  console.log("Expected PKP address:", expectedPKPAddress);
  if (recoveredAddress.toLowerCase() !== expectedPKPAddress.toLowerCase()) {
    throw new Error("Recovered address doesn't match expected PKP address");
  }

  // Now that we have the recovered address, get the latest nonce
  const nonce = await provider.getTransactionCount(recoveredAddress, "latest");

  console.log("Current nonce:", nonce);

  // Add the nonce to the unsigned transaction
  unsignedTransaction.nonce = nonce;

  // Check account balance
  const balance = await provider.getBalance(recoveredAddress);
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

  // Create signed transaction with the nonce
  const signedTx = ethers.utils.serializeTransaction(unsignedTransaction, hexSignature);

  // Log decoded transaction
  const decodedTx = ethers.utils.parseTransaction(signedTx);
  console.log("Decoded transaction:", JSON.stringify(decodedTx, null, 2));

  // Check balance of sending address
  const sendingAddress = ethers.utils.computeAddress('0x' + publicKey);
  const sendingBalance = await provider.getBalance(sendingAddress);
  console.log("Sending address balance:", ethers.utils.formatEther(sendingBalance), "ETH");

  // Send transaction
  try {
    console.log("About to send transaction...");
    console.log("Transaction data:", signedTx);
    const tx = await provider.sendTransaction(signedTx);
    console.log("Transaction sent:", tx.hash);
    console.log("Transaction details:", JSON.stringify(tx, null, 2));
  } catch (error) {
    console.error("Error sending transaction:");
    console.error(error.message);
    console.error(JSON.stringify(error, null, 2));
  }

  // Final network check
  const network = await provider.getNetwork();
  console.log("Connected to network:", network.name, "Chain ID:", network.chainId);

  Lit.Actions.setResponse({ response: "Transaction process completed" });
}

testSend();

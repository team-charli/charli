// @ts-nocheck
const relayerAction = async () => {
  console.log("Starting relayerAction");

  // Required parameters - these should always be passed from the calling action
  if (!relayerPkpTokenId) throw new Error("relayerPkpTokenId undefined");
  if (!relayerAddress) throw new Error("relayerAddress undefined");
  if (!relayerPublicKey) throw new Error("relayerPublicKey undefined");
  if (!callingActionId) throw new Error("callingActionId undefined");
  if (!usdcContractAddress) throw new Error("usdcContractAddress undefined");
  if (!txData) throw new Error("txData undefined");
  if (!rpcChain) throw new Error("rpcChain undefined");
  if (!rpcChainId) throw new Error("rpcChainId undefined");

  // Check permissions
  const isPermitted = await Lit.Actions.isPermittedAction({
    tokenId: relayerPkpTokenId,
    ipfsId: callingActionId
  });

  if (!isPermitted) {
    throw new Error("Unauthorized: Calling action is not permitted");
  }

  // Get the latest nonce
  const nonce = await Lit.Actions.getLatestNonce({ address: relayerAddress, chain: rpcChain });

  // Prepare the transaction with significantly reduced gas values
  const unsignedTransaction = {
    to: usdcContractAddress,
    nonce,
    chainId: rpcChainId,
    data: txData,
    type: 2,
    gasLimit: ethers.BigNumber.from('80000').toHexString(), // Reduced from 150000
    maxFeePerGas: ethers.utils.parseUnits('3', 'gwei').toHexString(), // Reduced from 12 gwei
    maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei').toHexString() // Reduced from 1.2 gwei
  };

  // Hash the transaction for signing
  const unsignedTransactionHash = ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTransaction));
  const toSign = ethers.utils.arrayify(unsignedTransactionHash);

  // Sign the transaction
  const signature = await Lit.Actions.signAndCombineEcdsa({
    toSign,
    publicKey: relayerPublicKey,
    sigName: "sig_1"
  });

  // Format the signature
  const jsonSignature = JSON.parse(signature);
  jsonSignature.r = "0x" + jsonSignature.r.substring(2);
  jsonSignature.s = "0x" + jsonSignature.s;
  const hexSignature = ethers.utils.joinSignature(jsonSignature);

  // Create the signed transaction
  const signedTx = ethers.utils.serializeTransaction(
    unsignedTransaction,
    hexSignature
  );

  const response = await Lit.Actions.runOnce(
    { waitForResponse: false, name: "txnSender" },
    async () => {
      try {
        // Get the RPC URL from Lit Actions
        const rpcUrl = await Lit.Actions.getRpcUrl({ chain: rpcChain });
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Send the transaction
        const transactionReceipt = await provider.sendTransaction(signedTx);
        return transactionReceipt.hash;
      } catch (error) {
        // Basic error reporting
        return "Error: When sending transaction: " + error.message;
      }
    }
  );
  // Return the response
  Lit.Actions.setResponse({ response: JSON.stringify(response) });
};

relayerAction();
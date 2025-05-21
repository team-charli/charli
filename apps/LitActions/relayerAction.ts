// @ts-nocheck
// relayerPKP... burn after setting permssions
// relayerPKP burn tx hash: ...
const relayerAction = async () => {
  console.log("Starting relayerAction");

  // Get relayer PKP information from globals that are injected into the environment
  // These variables are directly available in the global scope in Lit Actions

  // Create local references to the global variables
  let localRelayerPkpTokenId = relayerPkpTokenId;
  let localRelayerAddress = relayerAddress;
  let localPublicKey = relayerPublicKey;

  // Fallback to environment-specific values if variables weren't passed
  if (!localRelayerPkpTokenId || !localRelayerAddress || !localPublicKey) {
    console.log("Missing relayer information, falling back to env-specific values");
    if (env === "dev") {
      // Hardcoded fallback - this should never be used in production
      if (!localRelayerPkpTokenId) localRelayerPkpTokenId = "79954854284656953966413268915949291963372041247183575496884270979393743813646";
      if (!localRelayerAddress) localRelayerAddress = "0x67a7c841bB16e62b68f214961CA8738Bdc7bCd02";
      if (!localPublicKey) localPublicKey = "041c0f79e93c4777bf9858a20b123436e3b72819b86970b78bd23715da3197e9f487907d835fac8f1825412091506040cb7085e3e913ff9ddecccae9ddfed89567";

      console.log("Using fallback values:", {
        relayerPkpTokenId: localRelayerPkpTokenId,
        relayerAddress: localRelayerAddress,
        publicKey: localPublicKey
      });
    } else {
      throw new Error("Invalid env: " + env + ". Only 'dev' is currently supported.");
    }
  }

  // Validate required parameters
  if (!localRelayerPkpTokenId) throw new Error("relayerPkpTokenId undefined");
  if (!callingActionId) throw new Error("callingActionId undefined");
  if (!usdcContractAddress) throw new Error("usdcContractAddress undefined");
  if (!txData) throw new Error("txData undefined");
  if (!rpcChain) throw new Error("rpcChain undefined");
  if (!rpcChainId) throw new Error("rpcChainId undefined");

  // Check permissions
  const isPermitted = await Lit.Actions.isPermittedAction({
    tokenId: localRelayerPkpTokenId,
    ipfsId: callingActionId
  });

  if (!isPermitted) {
    throw new Error("Unauthorized: Calling action is not permitted");
  }

  // Get the latest nonce
  const nonce = await Lit.Actions.getLatestNonce({ address: localRelayerAddress, chain: rpcChain });

  // Prepare the transaction
  const unsignedTransaction = {
    to: usdcContractAddress,
    nonce,
    chainId: rpcChainId,
    data: txData,
    type: 2,
    gasLimit: ethers.BigNumber.from('150000').toHexString(), // Optimized based on actual usage (~78K)
    maxFeePerGas: ethers.utils.parseUnits('12', 'gwei').toHexString(), // Further reduced
    maxPriorityFeePerGas: ethers.utils.parseUnits('1.2', 'gwei').toHexString() // Further reduced
  };

  // Hash the transaction for signing
  const unsignedTransactionHash = ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTransaction));
  const toSign = ethers.utils.arrayify(unsignedTransactionHash);

  // Sign the transaction
  const signature = await Lit.Actions.signAndCombineEcdsa({
    toSign,
    publicKey: localPublicKey,
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

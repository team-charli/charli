// @ts-nocheck
// relayerPKP... burn after setting permssions
// relayerPKP burn tx hash: ...
const relayerAction = async () => {
  console.log("Starting relayerAction");
  
  // Get relayer PKP information from globals that are injected into the environment
  // These variables are directly available in the global scope in Lit Actions
  
  // DEBUG: Log all properties in the global scope to see what we have
  console.log("Available properties in global scope:", 
    Object.keys(globalThis).filter(key => 
      typeof globalThis[key] !== 'function' && 
      !['global', 'globalThis', 'self', 'window'].includes(key)
    )
  );
  
  // Check if the variables exist in the global scope
  console.log("relayerPkpTokenId exists in global scope:", typeof relayerPkpTokenId !== 'undefined');
  console.log("relayerAddress exists in global scope:", typeof relayerAddress !== 'undefined');
  console.log("relayerPublicKey exists in global scope:", typeof relayerPublicKey !== 'undefined');
  
  // Create local references to the global variables
  let localRelayerPkpTokenId = relayerPkpTokenId;
  let localRelayerAddress = relayerAddress;
  let localPublicKey = relayerPublicKey;
  
  console.log("Values from global scope:", {
    relayerPkpTokenId: localRelayerPkpTokenId,
    relayerAddress: localRelayerAddress,
    relayerPublicKey: localPublicKey
  });
  
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
  
  if (!localRelayerPkpTokenId) throw new Error("relayerPkpTokenId undefined");
  if (!callingActionId) throw new Error("callingActionId undefined");
  console.log("callingActionId", callingActionId);
  console.log("Final values being used:", {
    relayerPkpTokenId: localRelayerPkpTokenId,
    relayerAddress: localRelayerAddress,
    publicKey: localPublicKey
  });

  console.log("Checking permission for tokenId:", localRelayerPkpTokenId, "and ipfsId:", callingActionId);
  
  // Use the local variables we've set up
  const isPermitted = await Lit.Actions.isPermittedAction({
    tokenId: localRelayerPkpTokenId,
    ipfsId: callingActionId
  });
  
  console.log("Permission check result:", isPermitted);
  
  if (!isPermitted) {
    console.error("Permission denied! TokenId:", localRelayerPkpTokenId, "cannot be used by action:", callingActionId);
    throw new Error("Unauthorized: Calling action is not permitted");
  }
  
  console.log("Permission check passed! TokenId:", localRelayerPkpTokenId, "can be used by action:", callingActionId);

  // Use the local variables for the nonce check
  const nonce = await Lit.Actions.getLatestNonce({ address: localRelayerAddress, chain: rpcChain });
  console.log("The relayerAddress nonce!: ", nonce);

  const unsignedTransaction = {
    to: usdcContractAddress,
    nonce,
    chainId: rpcChainId,
    data: txData,
    type: 2,
    gasLimit: ethers.BigNumber.from('500000').toHexString(),
    maxFeePerGas: ethers.utils.parseUnits('20', 'gwei').toHexString(),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei').toHexString()
  };
  console.log("unsignedTransaction:", JSON.stringify(unsignedTransaction, null, 2));

  const unsignedTransactionHash = ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTransaction));
  const toSign = ethers.utils.arrayify(unsignedTransactionHash);

  console.log("toSign:", ethers.utils.hexlify(toSign));
  console.log("publicKey:", localPublicKey);

  const signature = await Lit.Actions.signAndCombineEcdsa({
    toSign,
    publicKey: localPublicKey,
    sigName: "sig_1" //+ Date.now().toString()
  });

  const jsonSignature = JSON.parse(signature);
  jsonSignature.r = "0x" + jsonSignature.r.substring(2);
  jsonSignature.s = "0x" + jsonSignature.s;
  const hexSignature = ethers.utils.joinSignature(jsonSignature);

  const signedTx = ethers.utils.serializeTransaction(
    unsignedTransaction,
    hexSignature
  );

  const recoveredAddress = ethers.utils.recoverAddress(toSign, hexSignature);
  console.log("Recovered Address:", recoveredAddress);

  const response = await Lit.Actions.runOnce(
    { waitForResponse: false, name: "txnSender" },
    async () => {
      try {
        const rpcUrl = await Lit.Actions.getRpcUrl({ chain: rpcChain });
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const transactionReceipt = await provider.sendTransaction(signedTx);
        return  transactionReceipt.hash;
      } catch (error) {
        return "Error: When sending transaction: " + error.message;
      }
    }
  );
  if (response?.length < 1 ) return;
  console.log("response", response);
  Lit.Actions.setResponse({ response: JSON.stringify(response)});
};

relayerAction();

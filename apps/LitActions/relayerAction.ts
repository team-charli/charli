// @ts-nocheck
// relayerPKP... burn after setting permssions
// relayerPKP burn tx hash: ...
const relayerAction = async () => {
  console.log("Starting relayerAction");
  let relayerPkpTokenId, relayerAddress, publicKey;
  if (env === "dev") {
    relayerPkpTokenId = "79954854284656953966413268915949291963372041247183575496884270979393743813646";
    relayerAddress = "0x67a7c841bB16e62b68f214961CA8738Bdc7bCd02";
    publicKey = "041c0f79e93c4777bf9858a20b123436e3b72819b86970b78bd23715da3197e9f487907d835fac8f1825412091506040cb7085e3e913ff9ddecccae9ddfed89567";
  } else {
    throw new Error("Invalid env: " + env + ". Only 'dev' is currently supported.");
  }
  if (!relayerPkpTokenId) throw new Error("relayerPkpTokenId undefined");
  if (!callingActionId) throw new Error("callingActionId undefined");
  console.log("callingActionId", callingActionId);

  const isPermitted = await Lit.Actions.isPermittedAction({
    tokenId: relayerPkpTokenId,
    ipfsId: callingActionId
  });
  if (!isPermitted) throw new Error("Unauthorized: Calling action is not permitted");

  const nonce = await Lit.Actions.getLatestNonce({ address: relayerAddress, chain: rpcChain });
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
  console.log("publicKey:", publicKey);

  const signature = await Lit.Actions.signAndCombineEcdsa({
    toSign,
    publicKey,
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

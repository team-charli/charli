// @ts-nocheck
const simplifiedSend = async () => {
  try {

    const chain =  "sepolia"
    const rpcUrl = await Lit.Actions.getRpcUrl({ chain });
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const pkpAddress = "0x5a81Fa235728fD5c36E632e08554D802a0e4F53A";

    // Get latest block number, fee data, nonce, and balance
    const [blockNumber, feeData, nonce, balance] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData(),
      provider.getTransactionCount(pkpAddress, "pending"),
      provider.getBalance(pkpAddress)
    ]);

    // Create unsigned transaction
    let unsignedTransaction = {
      from: pkpAddress,
      to,
      type: 2,
      value,
      maxFeePerGas: feeData.maxFeePerGas.mul(120).div(100),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.mul(120).div(100),
      nonce,
      chainId: 11155111,
      gasLimit: ethers.BigNumber.from(21000)
    };

    console.log("Unsigned transaction:", JSON.stringify(unsignedTransaction, null, 2));

    const serializedTx = ethers.utils.serializeTransaction(unsignedTransaction);
    const toSign = ethers.utils.arrayify(ethers.utils.keccak256(serializedTx));

    // Sign the transaction
    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign,
      publicKey,
      sigName: "testSend",
    });

    const jsonSignature = JSON.parse(signature);
    jsonSignature.r = "0x" + jsonSignature.r.substring(2);
    jsonSignature.s = "0x" + jsonSignature.s;
    const hexSignature = ethers.utils.joinSignature(jsonSignature);

    // Create signed transaction
    const signedTx = ethers.utils.serializeTransaction(unsignedTransaction, hexSignature);

    // Send transaction using runOnce
    let result;
    result = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "txnSender" },
      async () => {
        const rpcUrl = await Lit.Actions.getRpcUrl({ chain });
        const innerProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const tx = await innerProvider.sendTransaction(signedTx);
        console.log("Transaction sent from log:", result?.hash);
        Lit.Actions.setResponse({ response: `Transaction sent: ${result?.hash}`});

        return JSON.stringify({ hash: tx?.hash, details: tx });
      }
    );

    if (!result) {
      return
    }
  } catch (error) {
    console.error("Error sending transaction:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    Lit.Actions.setResponse({ response: "Transaction failed", error: error });
  }
};

simplifiedSend();

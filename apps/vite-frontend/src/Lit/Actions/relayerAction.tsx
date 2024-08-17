// @ts-nocheck

const RelayerAction = `
(async () => {
  const { signedTx, expectedSender, usdcContractAddress, spenderAddress, amount } = args;

  // Verify the incoming signed transaction
  const tx = ethers.utils.parseTransaction(signedTx);
  if (tx.from !== expectedSender) {
    throw new Error("Sender address does not match expected sender");
  }

  // Verify the transaction data
  const erc20Interface = new ethers.utils.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);
  const decodedData = erc20Interface.parseTransaction({ data: tx.data });
  if (decodedData.name !== "approve" ||
      decodedData.args[0] !== spenderAddress ||
      !decodedData.args[1].eq(ethers.BigNumber.from(amount))) {
    throw new Error("Transaction data does not match expected 'approve' call");
  }

  // Relay the transaction
  const latestNonce = await Lit.Actions.getLatestNonce({
    address: pkpAddress,
    chain: "ethereum",
  });

  const relayedTx = {
    ...tx,
    from: pkpAddress,
    nonce: latestNonce,
  };

  const serializedTx = ethers.utils.serializeTransaction(relayedTx);
  const unsignedTxHash = ethers.utils.keccak256(serializedTx);
  const toSign = ethers.utils.arrayify(unsignedTxHash);
  const signature = await Lit.Actions.signEcdsa({ toSign, publicKey: pkpPublicKey, sigName: "relayer_signature" });
  const signedRelayedTx = ethers.utils.serializeTransaction(relayedTx, signature);

  // Send the transaction
  const txResponse = await Lit.Actions.runOnce({
    waitForResponse: true,
    name: "sendTransaction"
  }, async () => {
    const rpcUrl = await Lit.Actions.getRpcUrl({ chain: "ethereum" });
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const tx = await provider.sendTransaction(signedRelayedTx);
    return tx.hash;
  });

  // Create IPFS link
  const linkData = {
    originalTxHash: ethers.utils.keccak256(signedTx),
    relayedTxHash: txResponse,
    originalSender: expectedSender,
    relaySender: pkpAddress,
    contractAddress: usdcContractAddress,
    spenderAddress: spenderAddress,
    amount: amount.toString(),
    timestamp: Date.now()
  };

  const ipfsHash = await Lit.Actions.runOnce({
    waitForResponse: true,
    name: "pinataPin"
  }, async () => {
    const pinataApiKey = "YOUR_PINATA_API_KEY";
    const pinataSecretApiKey = "YOUR_PINATA_SECRET_API_KEY";
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretApiKey
      },
      body: JSON.stringify(linkData)
    });
    const result = await response.json();
    return result.IpfsHash;
  });

  // Return transaction hash and IPFS hash
  Lit.Actions.setResponse({
    response: JSON.stringify({
      transactionHash: txResponse,
      ipfsHash: ipfsHash
    })
  });
})();
`;

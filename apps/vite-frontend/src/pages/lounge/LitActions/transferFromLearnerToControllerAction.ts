// @ts-nocheck
// keyId,
// ipfsId,
// learnerAddress,
// controllerAddress,
// controllerPubKey,
// paymentAmount,
// usdcContractAddress,
// chainId: 84532,
// chain
// sessionDataLearnerSig,
// sessionDataTeacherSig,
// sessionDuration,
// hashedLearnerAddress,
// hashedTeacherAddress,
// amount
// Above  values should be dynamically passed to the Lit Action through executeJs they are included here to avoid triggering ide diagnostics
// ipfs CID: QmSaCpwsRZts2SJ2aGcsQ2wudRaDBnL5MH1AVH96gZfjFJ
const transferFromLearnerToControllerAction =
async () => {
  try{
  const verifyDurationAndId = () => {
    // Encode the data
    const encodedData = ethers.utils.concat([
      ethers.utils.toUtf8Bytes(secureSessionId),
      ethers.utils.hexlify(ethers.BigNumber.from(sessionDuration))
    ]);

    // Hash the encoded data
    const message = ethers.utils.keccak256(encodedData);

    // Recover the addresses from the signatures
    const recoveredLearnerAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sessionDataLearnerSig);
    const recoveredTeacherAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sessionDataTeacherSig);

    // Hash the recovered addresses
    const hashedRecoveredLearnerAddress = ethers.utils.keccak256(recoveredLearnerAddress);
    const hashedRecoveredTeacherAddress = ethers.utils.keccak256(recoveredTeacherAddress);

    // Compare the hashed recovered addresses with the provided hashed addresses
    const learnerSignedDuration = hashedLearnerAddress === hashedRecoveredLearnerAddress;
    const teacherSignedDuration = hashedTeacherAddress === hashedRecoveredTeacherAddress;

    if (!learnerSignedDuration || !teacherSignedDuration) {
      Lit.Actions.setResponse({ response: JSON.stringify({ error: "Invalid signatures or addresses don't match" }) });
      throw new Error("Invalid signatures or addresses don't match");
    }
  };
  verifyDurationAndId();

  const claimPkp = async () => {
    try {
      const keyId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${ipfsId}:${userId}`));
      await Lit.Actions.claimKey({ keyId });
    } catch (error) {
      Lit.Actions.setResponse(error);
    }
  }

  const decryptedLearnerAddress = async () => {
    try {
      return await Lit.Actions.decryptToSingleNode({
        ciphertext: learnerAddressCiphertext,
        dataToEncryptHash: learnerAddressEncryptHash,
        authSig: null,
        chain: "ethereum",
        accessControlConditions
      })
    } catch(error) {
      console.error(error);
      Lit.Actions.setResponse("error in decryptedLearnerAddress function" + JSON.stringify(error));
    }
  }
  let learnerAddress;

  try {
    learnerAddress = await decryptedLearnerAddress();
  } catch(error) {
    console.error(error);
    Lit.Actions.setResponse("error at decryptedLearnerAddress CALL" + JSON.stringify(error));
  }

  claimPkp();

  const abi = [
    "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
  ];

  let latestNonce;
  try {
    latestNonce = await Lit.Actions.getLatestNonce({
      address: controllerAddress,
      chain,
    });
  } catch (error) {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Failed to get latest nonce", details: error.message }) });
    return;
  }

  const contract = new ethers.Contract(usdcContractAddress, abi);
  const amountBigNumber = ethers.utils.parseUnits(amount, 6);

  const txData = contract.interface.encodeFunctionData("transferFrom", [learnerAddress, controllerAddress, amountBigNumber]);

  const txObject = {
    to: usdcContractAddress,
    nonce: latestNonce,
    chainId,
    gasLimit: ethers.utils.hexlify(50000),
    from: controllerAddress,
    data: txData,
    type: 2
  };

  const serializedTx = ethers.utils.serializeTransaction(txObject);
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serializedTx));
  const toSign = await new TextEncoder().encode(hash);

  const conditions = [
    {
      contractAddress: usdcContractAddress,
      standardContractType: "ERC20",
      chain,
      method: "allowance",
      parameters: [learnerAddress, controllerAddress],
      returnValueTest: {
        comparator: '>=',
        value: parseInt(amount)
      }
    }
  ];

  let learnerAllowedAmount;
  try {
    learnerAllowedAmount = await Lit.Actions.checkConditions({conditions, authSig: null, chain});
  } catch (error) {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Failed to check allowance conditions", details: error.message }) });
    return;
  }

  if (learnerAllowedAmount) {
    let signature;
    try {
      signature = await Lit.Actions.signAndCombineEcdsa({
        toSign,
        publicKey: controllerPubKey,
        sigName: "sign_transfer_from",
      });
    } catch (error) {
      Lit.Actions.setResponse({ response: JSON.stringify({ error: "Failed to sign transaction", details: error.message }) });
      return;
    }

    console.log('Signature for transferFrom:', signature);

    let txResponse;
    let linkData;
    try {
      txResponse = await Lit.Actions.runOnce({
        waitForResponse: true,
        name: "transferFromTxSender"
      }, async () => {
          const rpcUrl = await Lit.Actions.getRpcUrl({ chain: chain });
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          const signedTx = ethers.utils.serializeTransaction(txObject, signature);
          const tx = await provider.sendTransaction(signedTx);
          await tx.wait(); // Wait for the transaction to be mined
          return JSON.stringify({
            transactionHash: tx.hash,
            blockHash: tx.blockHash,
            blockNumber: tx.blockNumber
          });
        });

      txResponse = JSON.parse(txResponse);

      // Create IPFS link
      linkData = {
        originalTxHash: hash,
        relayedTxHash: txResponse.transactionHash,
        learnerAddress: learnerAddress,
        controllerAddress: controllerAddress,
        amount: amount,
        usdcContractAddress: usdcContractAddress,
        sessionId: sessionId,
        blockHash: txResponse.blockHash,
        blockNumber: txResponse.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(error)
    }
    let ipfsHash;
    try {
      ipfsHash = await Lit.Actions.ipfsStore({ data: JSON.stringify(linkData) });
      console.log('Data stored on IPFS:', ipfsHash);
    } catch (error) {
      console.error('Failed to store data on IPFS:', error);
    }

    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        transactionHash: txResponse.transactionHash,
        blockHash: txResponse.blockHash,
        blockNumber: txResponse.blockNumber,
        ipfsHash: ipfsHash
      })
    });
  } else {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "ACC failed: Insufficient allowance" }) });
  }
  } catch (error) {
    console.error("Uncaught error in transferFromLearnerToControllerAction function:", error);
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Uncaught error", details: error.message }) });
  }
};
transferFromLearnerToControllerAction();

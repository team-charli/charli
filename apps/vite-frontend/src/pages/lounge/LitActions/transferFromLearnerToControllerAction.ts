// @ts-nocheck
// declare const ethers: any
// let learnerAddress='0x'
// let controllerAddress='0x'
// let controllerPubKey='0x'
// let paymentAmount=0
// let usdcContractAddress="0x"
// let chainId=84532;
// let chain = "sepolia";
// let authSig="string";
// let requestedSessionDurationLearnerSig:string;
// let requestedSessionDurationTeacherSig: string;
// let sessionDuration: string;
// let hashedLearnerAddress: string;
// let hashedTeacherAddress: string;
// declare const LitActions: any;

// Above  values should be dynamically passed to the Lit Action through executeJs they are included here to avoid triggering ide diagnostics

//ipfs CID: QmYbKHk22dkCexxVadcxfUvnzuWcf4sgiyBGa4dTGGDutr
const transferFromLearnerToControllerAction = `
(async () => {
  const verifyDurationAndId = () => {
    // Encode the data
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      [sessionId, sessionDuration]
    );

    // Hash the encoded data
    const message = ethers.utils.keccak256(encodedData);

    // Recover the addresses from the signatures
    const recoveredLearnerAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), requestedSessionDurationLearnerSig);
    const recoveredTeacherAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), requestedSessionDurationTeacherSig);

    // Hash the recovered addresses
    const hashedRecoveredLearnerAddress = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(recoveredLearnerAddress));
    const hashedRecoveredTeacherAddress = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(recoveredTeacherAddress));

    // Compare the hashed recovered addresses with the provided hashed addresses
    const learnerSignedDuration = hashedLearnerAddress === hashedRecoveredLearnerAddress;
    const teacherSignedDuration = hashedTeacherAddress === hashedRecoveredTeacherAddress;

    if (!learnerSignedDuration || !teacherSignedDuration) {
      Lit.Actions.setResponse({ response: JSON.stringify({ error: "Invalid signatures or addresses don't match" }) });
      throw new Error("Invalid signatures or addresses don't match");
    }
  };

  try {
    verifyDurationAndId();

    const abi = [
      "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
    ];

    let latestNonce;
    try {
      latestNonce = await Lit.Actions.getLatestNonce({
        address: controllerAddress,
        chain: "chronicle",
      });
    } catch (error) {
      Lit.Actions.setResponse({ response: JSON.stringify({ error: "Failed to get latest nonce", details: error.message }) });
      return;
    }

    const contract = new ethers.Contract(usdcContractAddress, abi);
    const txData = contract.interface.encodeFunctionData("transferFrom", [learnerAddress, controllerAddress, amount]);

    const txObject = {
      to: usdcContractAddress,
      nonce: latestNonce,
      chainId: chainId,
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
          value: ethers.utils.formatUnits(amount, 6)
        }
      }
    ];

    let learnerAllowedAmount;
    try {
      learnerAllowedAmount = await Lit.Actions.checkConditions({conditions, authSig, chain});
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

      let txResponse = await Lit.Actions.runOnce({
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
      const linkData = {
        originalTxHash: hash,
        relayedTxHash: txResponse.transactionHash,
        learnerAddress: learnerAddress,
        controllerAddress: controllerAddress,
        amount: amount.toString(),
        usdcContractAddress: usdcContractAddress,
        sessionId: sessionId,
        blockHash: txResponse.blockHash,
        blockNumber: txResponse.blockNumber,
        timestamp: Date.now()
      };

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
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Unexpected error occurred", details: error.message }) });
  }
})();

`;

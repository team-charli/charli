// @ts-nocheck
const refundLearnerAction = async () => {
  try {
    console.log("Starting refundLearnerAction");

    if (!usdcContractAddress || !learnerAddress || !refundAmount || !controllerAddress || !controllerPubKey || !chain || !chainId || !relayerIpfsId || !signedReason) {
      throw new Error("Missing required parameters");
    }

    // Reconstruct the original message string
    const parsedReason = JSON.parse(signedReason);
    const reconstructedMessage = JSON.stringify({
      hashed_learner_address: parsedReason.hashed_learner_address,
      hashed_teacher_address: parsedReason.hashed_teacher_address,
      confirmed_time_date: parsedReason.confirmed_time_date,
      retrieved_timestamp: parsedReason.retrieved_timestamp,
    });

    // Recover public key and derive address
    const msgHash = ethers.utils.hashMessage(reconstructedMessage);
    const recoveredPubKey = ethers.utils.recoverPublicKey(msgHash, parsedReason.worker_signature);
    const recoveredAddress = ethers.utils.computeAddress(recoveredPubKey);

    if (recoveredPubKey.toLowerCase() !== controllerPubKey.toLowerCase()) {
      throw new Error("Invalid signedReason: recoveredPubKey does not match controllerPubKey");
    }
    if (recoveredAddress.toLowerCase() !== controllerAddress.toLowerCase()) {
      throw new Error("Invalid signedReason: recoveredAddress does not match controllerAddress");
    }

    // Check controller balance
    const conditions = [
      {
        contractAddress: usdcContractAddress,
        standardContractType: "ERC20",
        chain,
        method: "balanceOf",
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '>=',
          value: ethers.utils.formatUnits(refundAmount, 6)
        }
      }
    ];

    const isFunded = await Lit.Actions.checkConditions({
      conditions,
      authSig: null,
      chain
    });

    if (!isFunded) throw new Error("Insufficient controller USDC balance");

    // Encode transfer
    const abi = ["function transfer(address to, uint256 value) returns (bool)"];
    const contract = new ethers.Contract(usdcContractAddress, abi);
    const amount = ethers.utils.parseUnits(String(refundAmount), 6);
    const txData = contract.interface.encodeFunctionData("transfer", [learnerAddress, amount]);

    // Send via relayer
    const relayerResponse = await Lit.Actions.call({
      ipfsId: relayerIpfsId,
      params: {
        env,
        callingActionId: Lit.Auth.actionIpfsIds[Lit.Auth.actionIpfsIds.length - 1],
        txData,
        usdcContractAddress: usdcContractAddress,
        rpcChain: chain,
        rpcChainId: chainId,
      }
    });

    const relayedTxHash =
      typeof relayerResponse === 'string'
        ? relayerResponse                               // e.g. raw tx hash string
        : relayerResponse?.txHash ?? relayerResponse?.hash ?? null;

    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        relayedTxHash                                   // 👈  ← EXACT SAME KEY used by transferControllerToTeacherAction
      })
    });

  } catch (error) {
    console.error("Error in refundLearnerAction:", error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

refundLearnerAction();


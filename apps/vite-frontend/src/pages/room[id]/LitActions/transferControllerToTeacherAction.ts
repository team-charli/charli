// @ts-nocheck
// import ethers from 'ethers' //remove in deploy

// let teacherRole, teacherPeerId, teacherRoomId, teacherDuration, learnerRole, learnerPeerId, learnerRoomId, learnerDuration,  chainId, addressTimestampWorkerWallet,  clientTimestamp, signedClientTimestamp,
// chain = "0x",
// hashedTeacherAddress = "0x",
// hashedLearnerAddress = "0x",
// authSig = "0x",
// sessionDuration = 0,
// teacherDurationSig = "0x",
// learnerDurationSig = "0x",
// teacherJoinedAt = 0,
// learnerJoinedAt = 0,
// teacherLeftAt = 0,
// learnerLeftAt = 0,
// teacherJoinedAtSig = "",
// learnerJoinedAtSig = "",
// teacherLeftAtSig = "",
// learnerLeftAtSig = "",
// faultType = 'learnerfault_didnt_join' || 'teacherFault_didnt_join' || 'learnerFault_connection_timeout' || 'teacherFault_connection_timeout' || undefined,
// faultUser = 'teacher' || 'learner' || undefined,
// faultTime = 0,
// faultTimeSig = "",
// faultData = {
//   faultType: faultType,
//   faultUser: faultUser,
//   faultTime: faultTime,
//   faultTimeSig: faultTimeSig,
// },
// userAddress = "0x"
// ;
/* above are passed in params, must delete before deploy */

const transferControllerToTeacherAction = async () => {
  const CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS = '0xeaeC934F96e754a71829b4048633B3f054421dcB';
  const USDC_CONTRACT_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const buildTxDataObj = async (recipientAddress) => {
    const rate = 0.30;
    const paymentAmount = sessionDuration * rate;
    const abi = ["function transfer(address to, uint256 amount) returns (boolean)"];
    const contract = new ethers.Contract(USDC_CONTRACT_ADDRESS, abi);
    const amount = ethers.parseUnits(String(paymentAmount), 6);

    const txData = contract.interface.encodeFunctionData("transfer", [recipientAddress, amount]);

    const latestNonce = await Lit.Actions.getLatestNonce({ address: controllerAddress, chain });

    const txObject = {
      to: USDC_CONTRACT_ADDRESS,
      nonce: latestNonce,
      chainId: 84532,
      gasLimit: ethers.utils.hexlify(50000),
      from: controllerAddress,
      data: txData,
      type: 2
    };

    return { txObject, amount };
  };

  const verifyDuration = () => {
    const teacherAddress = ethers.verifyMessage(String(sessionDuration), teacherDurationSig);
    const learnerAddress = ethers.verifyMessage(String(sessionDuration), learnerDurationSig);

    const teacherSignedDuration = hashedTeacherAddress === ethers.keccak256(teacherAddress);
    const learnerSignedDuration = hashedLearnerAddress === ethers.keccak256(hashedLearnerAddress);

    if (!teacherSignedDuration) {
      throw new Error("teacher never signed session duration");
    } else if (!learnerSignedDuration) {
      throw new Error("learner never signed session duration");
    }
  };

  const learnerFaultCase = (() => {
    if (faultUser !== 'learner') return false;
    const faultSigValid = ethers.verifyMessage(String(faultTime), faultTimeSig) === CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS;
    return faultSigValid && (faultType === 'learnerfault_didnt_join' || faultType === 'learnerFault_connection_timeout');
  })();

  const teacherFaultCase = (() => {
    if (faultUser !== 'teacher') return false;
    const faultSigValid = ethers.verifyMessage(String(faultTime), faultTimeSig) === CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS;
    return faultSigValid && (faultType === 'teacherFault_didnt_join' || faultType === 'teacherFault_connection_timeout');
  })();

  const verifyTimestamps = (() => {
    const teacherJoinedAtVerified = hashedTeacherAddress === ethers.keccak256(ethers.verifyMessage(String(teacherJoinedAt), teacherJoinedAtSig));
    const teacherLeftAtVerified = hashedTeacherAddress === ethers.keccak256(ethers.verifyMessage(String(teacherLeftAt), teacherLeftAtSig));
    const teacherDuration = teacherLeftAt - teacherJoinedAt;
    const teacherMetOrExceededDuration = teacherDuration >= sessionDuration;

    const learnerJoinedAtVerified = hashedLearnerAddress === ethers.keccak256(ethers.verifyMessage(String(learnerJoinedAt), learnerJoinedAtSig));
    const learnerLeftAtVerified = hashedLearnerAddress === ethers.keccak256(ethers.verifyMessage(String(learnerLeftAt), learnerLeftAtSig));
    const learnerDuration = learnerLeftAt - learnerJoinedAt;
    const learnerMetOrExceededDuration = learnerDuration >= sessionDuration;

    return teacherJoinedAtVerified && teacherLeftAtVerified && teacherMetOrExceededDuration &&
      learnerJoinedAtVerified && learnerLeftAtVerified && learnerMetOrExceededDuration;
  })();

  const storeOnIPFS = async (data) => {
    try {
      const ipfsHash = await Lit.Actions.ipfsStore({ data: JSON.stringify(data) });
      console.log('Data stored on IPFS:', ipfsHash);
      return ipfsHash;
    } catch (error) {
      console.error('Failed to store data on IPFS:', error);
      return null;
    }
  };

  const sendTransaction = async (txObject, signature, recipientAddress) => {
    let txResponse = await Lit.Actions.runOnce({
      waitForResponse: true,
      name: "transferTxSender"
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

    return JSON.parse(txResponse);
  };

  try {
    verifyDuration();

    let txObject, amount, signature, txResponse, ipfsHash;

    if (!learnerFaultCase && !teacherFaultCase && verifyTimestamps) {
      // Complete case
      ({ txObject, amount } = await buildTxDataObj(userAddress));

      const serializedTx = ethers.utils.serializeTransaction(txObject);
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serializedTx));
      const toSign = await new TextEncoder().encode(hash);

      signature = await Lit.Actions.signAndCombineEcdsa({
        toSign,
        publicKey: controllerPubKey,
        sigName: "Pay_Teacher_from_Controller",
      });

      txResponse = await sendTransaction(txObject, signature, userAddress);

    } else if (learnerFaultCase) {
      // Learner fault case
      ({ txObject, amount } = await buildTxDataObj(teacherAddress));

      const serializedTx = ethers.utils.serializeTransaction(txObject);
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serializedTx));
      const toSign = await new TextEncoder().encode(hash);

      signature = await Lit.Actions.signAndCombineEcdsa({
        toSign,
        publicKey: controllerPubKey,
        sigName: "Pay_Teacher_from_Controller_LearnerFault",
      });

      txResponse = await sendTransaction(txObject, signature, teacherAddress);

    } else if (teacherFaultCase) {
      // Teacher fault case
      ({ txObject, amount } = await buildTxDataObj(learnerAddress));

      const serializedTx = ethers.utils.serializeTransaction(txObject);
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serializedTx));
      const toSign = await new TextEncoder().encode(hash);

      signature = await Lit.Actions.signAndCombineEcdsa({
        toSign,
        publicKey: controllerPubKey,
        sigName: "Pay_Teacher_from_Controller_TeacherFault",
      });

      txResponse = await sendTransaction(txObject, signature, learnerAddress);

    } else {
      // Conditions not met case
      throw new Error("Conditions not met for transfer");
    }

    // Store data on IPFS for all successful cases
    const linkData = {
      case: learnerFaultCase ? "learnerFault" : teacherFaultCase ? "teacherFault" : "complete",
      originalTxHash: ethers.utils.keccak256(ethers.utils.serializeTransaction(txObject)),
      relayedTxHash: txResponse.transactionHash,
      controllerAddress: controllerAddress,
      recipientAddress: txObject.to,
      amount: amount.toString(),
      usdcContractAddress: USDC_CONTRACT_ADDRESS,
      sessionDuration: sessionDuration,
      blockHash: txResponse.blockHash,
      blockNumber: txResponse.blockNumber,
      timestamp: Date.now(),
      faultData: learnerFaultCase || teacherFaultCase ? {
        faultType: faultType,
        faultUser: faultUser,
        faultTime: faultTime,
        faultTimeSig: faultTimeSig,
      } : undefined
    };

    ipfsHash = await storeOnIPFS(linkData);

    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        case: linkData.case,
        transactionHash: txResponse.transactionHash,
        blockHash: txResponse.blockHash,
        blockNumber: txResponse.blockNumber,
        ipfsHash: ipfsHash
      })
    });

  } catch (error) {
    console.error('Error in transferControllerToTeacherAction:', error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

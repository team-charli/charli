import ethers from 'ethers' //remove in deploy

let teacherRole, teacherPeerId, teacherRoomId, teacherDuration, learnerRole, learnerPeerId, learnerRoomId, learnerDuration, usdcContractAddress, chainId, addressTimestampWorkerWallet,  clientTimestamp, signedClientTimestamp,
chain = "0x",
hashedTeacherAddress = "0x",
hashedLearnerAddress = "0x",
authSig = "0x",
sessionDuration = 0,
teacherDurationSig = "0x",
learnerDurationSig = "0x",
teacherJoinedAt = 0,
learnerJoinedAt = 0,
teacherLeftAt = 0,
learnerLeftAt = 0,
teacherJoinedAtSig = "",
learnerJoinedAtSig = "",
teacherLeftAtSig = "",
learnerLeftAtSig = "",
faultType = 'learnerfault_didnt_join' || 'teacherFault_didnt_join' || 'learnerFault_connection_timeout' || 'teacherFault_connection_timeout' || undefined,
faultUser = 'teacher' || 'learner' || undefined,
faultTime = 0,
faultTimeSig = "",
faultData = {
  faultType: faultType,
  faultUser: faultUser,
  faultTime: faultTime,
  faultTimeSig: faultTimeSig,
},
userAddress = "0x"
;
/* above are passed in params, must delete before deploy */
// export const transferControllerToTeacherAction = `

(async () => {
  const CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS = '0x3A7a366A278559BC57F3750D458aE2bB044252d0'
  const USDC_CONTRACT_ADDRESS = "0x"
  const buildTxDataObj = async (recipientAddress: string ) => {
    const rate = .30;
    const paymentAmount = sessionDuration * rate;
    const abi = [ "function transfer(address to, uint256 amount) returns (boolean)" ];
    const contract = new ethers.Contract(USDC_CONTRACT_ADDRESS , abi);
    const amount = ethers.parseUnits(String(paymentAmount), 6);

    const txData = contract.interface.encodeFunctionData("transfer", [recipientAddress, amount]);

    const latestNonce = await LitActions.getLatestNonce({ address: controllerAddress, chain });

    const txObject = {
      "to": USDC_CONTRACT_ADDRESS,
      "nonce": latestNonce,
      "chainId": 84532,
      "gasLimit": "50000",
      "from": controllerAddress,
      "data": txData,
      "type": 2
    }

    LitActions.setResponse({ response: JSON.stringify({ txObject }) });
    const tx = ethers.Transaction.from(txObject);
    const serializedTx = tx.unsignedSerialized;
    const rlpEncodedTxn = ethers.getBytes(serializedTx);
    const unsignedTxn = ethers.keccak256(rlpEncodedTxn);
    const toSign = unsignedTxn;
    const conditions = [
      {
        contractAddress: USDC_CONTRACT_ADDRESS,
        standardContractType: "ERC20",
        chain,
        method: "balanceOf",
        parameters: [':userAddress' ],
        returnValueTest: {
          comparator: '>=',
          value: ethers.formatUnits(paymentAmount, 6)
        }
      }
    ];
  }
  const verifyDuration = () => {
    const teacherAddress = ethers.verifyMessage(String(sessionDuration), teacherDurationSig);
    const learnerAddress = ethers.verifyMessage(String(sessionDuration), learnerDurationSig);

    const teacherSignedDuration: boolean =  hashedTeacherAddress === ethers.keccak256(teacherAddress);
    const learnerSignedDuration: boolean = hashedLearnerAddress === ethers.keccak256(hashedLearnerAddress);

    //redundant checks for visibility; check made before join session
    if (!teacherSignedDuration) {
      throw new Error(`teacher never signed session duration`)
    } else if (!learnerSignedDuration) {
      throw new Error(`learner never signed session duration`)
    }

  }
  // complete case [x]
  // verify duration [x]
  // check both huddle duration [x]
  // check funds exist [x]
  // check both signed data [x]
  const learnerFaultCase = (() => {
    if (faultUser !== 'learner') return false;
    let faultSigValid: boolean;

    ethers.verifyMessage(String(faultTime),CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS) === CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS ? faultSigValid = true: faultSigValid = false;

    if (faultSigValid && (faultType === 'learnerfault_didnt_join' || faultType === 'learnerFault_connection_timeout')) {
      return true;
    }
  })();

  const teacherFaultCase = (() => {
    if (faultUser !== 'teacher') return false;
    let faultSigValid: boolean;

    ethers.verifyMessage(String(faultTime),CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS) === CHARLI_SESSION_SESSION_TIME_TRACKER_ADDRESS ? faultSigValid = true: faultSigValid = false;

    if (faultSigValid && (faultType === 'teacherFault_didnt_join' || faultType === 'teacherFault_connection_timeout')) {
      return true;
    }
  })();

  const verifyTimestamps = (() => {
    let teacherCompletedSessionVerified: boolean;

    let teacherJoinedAtVerified;
    hashedTeacherAddress === ethers.keccak256(ethers.verifyMessage(String(teacherJoinedAt), teacherJoinedAtSig)) ? teacherJoinedAtVerified = true : teacherJoinedAtVerified = false;

    let teacherLeftAtVerified;
    hashedTeacherAddress === ethers.keccak256(ethers.verifyMessage(String(teacherLeftAt), teacherLeftAtSig)) ? teacherLeftAtVerified = true : teacherLeftAtVerified = false;


    let teacherDuration: number = teacherLeftAt - teacherJoinedAt;
    let teacherMetOrExceededDuration;
    teacherDuration >= sessionDuration ? teacherMetOrExceededDuration = true : teacherMetOrExceededDuration = false;

    if (teacherJoinedAtVerified && teacherLeftAtVerified && teacherMetOrExceededDuration) {
      teacherCompletedSessionVerified = true;
    } else {
      teacherCompletedSessionVerified = false;
    }
    ///
    let learnerCompletedSessionVerified: boolean;

    let learnerJoinedAtVerified;
    hashedLearnerAddress === ethers.keccak256(ethers.verifyMessage(String(learnerJoinedAt), learnerJoinedAtSig)) ? learnerJoinedAtVerified = true : teacherJoinedAtVerified = false;

    let learnerLeftAtVerified;
    hashedLearnerAddress === ethers.keccak256(ethers.verifyMessage(String(learnerLeftAt), learnerLeftAtSig)) ? learnerLeftAtVerified = true : learnerLeftAtVerified = false;

    let learnerDuration: number = learnerLeftAt - learnerJoinedAt;
    let learnerMetOrExceededDuration: boolean;
    learnerDuration >= sessionDuration ? learnerMetOrExceededDuration = true : learnerMetOrExceededDuration = false;


    if (learnerJoinedAtVerified && learnerLeftAtVerified && learnerMetOrExceededDuration) {
      learnerCompletedSessionVerified = true;
    } else {
      learnerCompletedSessionVerified = false;
    }

    if (teacherCompletedSessionVerified && learnerCompletedSessionVerified){
      return true;
    } else {
      return false;
    }
  })();

  const isFunded = await LitActions.checkConditions({conditions, authSig, chain})
  console.log("isFunded: ", isFunded );

  const completeCase = verifyTimestamps && isFunded

  if (!learnerFaultCase && !teacherFaultCase && completeCase) {
    const sigShare = await LitActions.signEcdsa({
      toSign: await buildTxDataObj(userAddress),
      publicKey: controllerPubKey,
      sigName: "Pay_Teacher_from_Controller",
    });
    console.log('sigShare', sigShare);
  } else if (learnerFaultCase) {
    await LitActions.signEcdsa({
      toSign: await buildTxDataObj(userAddress),
      publicKey: controllerPubKey,
      sigName: "Pay_Teacher_from_Controller",
    })
  } else if (teacherFaultCase) {
    await LitActions.signEcdsa({
      toSign: await buildTxDataObj(userAddress),
      publicKey: controllerPubKey,
      sigName: "Pay_Teacher_from_Controller",
    })
  }
})();
// `


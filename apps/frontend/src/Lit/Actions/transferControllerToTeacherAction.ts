import ethers from 'ethers' //remove in deploy

let teacherRole, teacherPeerId, teacherRoomId, teacherJoinedAt, teacherLeftAt, teacherJoinedAtSig, teacherLeftAtSig, teacherFaultTime, teacherFaultTimeSig, teacherDuration, hashedTeacherAddress, teacherHashedLearnerAddress, learnerRole, learnerPeerId, learnerRoomId, learnerJoinedAt, learnerLeftAt, learnerJoinedAtSig, learnerLeftAtSig, learnerFaultTime, learnerFaultTimeSig, learnerDuration, learnerHashedTeacherAddress, hashedLearnerAddress, usdcContractAddress, chainId, chain, addressTimestampWorkerWallet, authSig, clientTimestamp, signedClientTimestamp, confirmedDuration, confirmedDuration_teacherSignature, confirmedDuration_learnerSignature

/* above are passed in params, must delete before deploy */

// export const transferControllerToTeacherAction = `

(async () => {

  const usdcContractAddress = "0x"
  const rate = .30;
  const paymentAmount = signedDuration * rate;
  const abi = [
    "function transfer(address to, uint256 amount) returns (boolean)"
  ];

  const contract = new ethers.Contract(usdcContractAddress , abi);
  const recipient = teacherAddress;
  const amount = ethers.parseUnits(String(paymentAmount), 6);
  const txData = contract.interface.encodeFunctionData("transfer", [recipient, amount]);

  const latestNonce = await LitActions.getLatestNonce({
    address: controllerAddress,
    chain,
  });

  const txObject = {

    "to": usdcContractAddress,
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
      contractAddress: usdcContractAddress,
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
  const verifyAndReturnDuration = () => {
    const teacherAddress = ethers.verifyMessage(confirmedDuration, confirmedDuration_teacherSignature);
    const learnerAddress = ethers.verifyMessage(confirmedDuration, confirmedDuration_learnerSignature);

    const teacherSignedDuration: boolean =  hashedTeacherAddress === ethers.keccak256(teacherAddress);
    const learnerSignedDuration: boolean = hashedLearnerAddress === ethers.keccak256(hashedLearnerAddress);

    //redundant checks for visibility; check made before join session
    if (!teacherSignedDuration) {
      throw new Error(`teacher never signed session duration`)
    } else if (!learnerSignedDuration) {
      throw new Error(`learner never signed session duration`)
    }

  }


  const checkBothSigned = (
  ) => {
    const checkSigs = ({ role, hashedAddress, timestamp, signature, workerSignature, workerPublicAddress }: CheckSigsParams) => {
      // Verify user signature
      const signerAddress = ethers.verifyMessage(`${timestamp}${role}`, signature);
      const isUserVerified = ethers.keccak256(signerAddress) === hashedAddress;

      // Verify worker signature
      const workerSignerAddress = ethers.verifyMessage(`${timestamp}${role}`, workerSignature);
      const isWorkerVerified = workerSignerAddress.toLowerCase() === workerPublicAddress.toLowerCase();

      return isUserVerified && isWorkerVerified;
    };

    const teacherJoinSigs: boolean = checkSigs({
      role: "teacher",
      hashedAddress: hashTeacherAddress,
      timestamp: teacher_joined_timestamp,
      signature: teacher_joined_signature,
      workerSignature: teacher_joined_timestamp_worker_sig,
      workerPublicAddress
    });

    const learnerJoinSigs: boolean = checkSigs({
      role: "learner",
      hashedAddress: hashLearnerAddress,
      timestamp: learner_joined_timestamp,
      signature: learner_joined_signature,
      workerSignature: learner_joined_timestamp_worker_sig,
      workerPublicAddress
    });

    const teacherLeaveSigs: boolean = checkSigs({
      role: "teacher",
      hashedAddress: hashTeacherAddress,
      timestamp: teacher_left_timestamp,
      signature: teacher_left_signature,
      workerSignature: teacher_left_timestamp_worker_sig,
      workerPublicAddress
    });

    const learnerLeaveSigs: boolean = checkSigs({
      role: "learner",
      hashedAddress: hashLearnerAddress,
      timestamp: learner_left_timestamp,
      signature: learner_left_signature,
      workerSignature: learner_left_timestamp_worker_sig,
      workerPublicAddress
    });

    console.log({ teacherJoinSigs, learnerJoinSigs, teacherLeaveSigs, learnerLeaveSigs });

    return teacherJoinSigs && learnerJoinSigs && teacherLeaveSigs && learnerLeaveSigs;
  };

  const isFunded = await LitActions.checkConditions({conditions, authSig, chain})
  console.log("isFunded: ", isFunded )

  const bothSigned: boolean = checkBothSigned();
  console.log("bothSigned",bothSigned )

  if (isFunded && bothSigned) {
    const sigShare = await LitActions.signEcdsa({
      toSign,
      publicKey: controllerPubKey,
      sigName: "Pay_Teacher_from_Controller",
    });
    console.log('sigShare', sigShare);
  }
})();
// `

interface CheckSigsParams {
  role: "teacher" | "learner";
  hashedAddress: string;
  timestamp: string;
  signature: string;
  workerSignature: string;
  workerPublicAddress: string;
};


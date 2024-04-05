import ethers from 'ethers' //remove in deploy
  //const teacherAddress = "0x"
  //const hashLearnerAddress = "0x"
  //let hashTeacherAddress = "0x"
  //const controllerAddress = "0x"
  //const controllerPubKey = "0x";
  //const paymentAmount=0;
  //const usdcContractAddress= "0x"
  //const authSig="0x"
  //const chain="baseSepolia"
  ////sigs


  //let learner_joined_timestamp = "2024-03-30T19:53:24.510Z";
  //let learner_joined_signature =  '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac0'
  //let teacher_joined_timestamp = "2024-03-30T19:53:24.510Z";
  //let teacher_joined_signature = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8';
  //let learner_left_timestamp = "2024-03-30T20:25:49.773Z"
  //let learner_left_signature = '0x57c65f1718e8297f4048beff2419e134656b7a856872b27ad77846e395f13ffe'
  //let teacher_left_timestamp = "2024-03-30T20:25:49.773Z"
  //let teacher_left_signature = '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32668'

  //let learner_joined_timestamp_worker_sig, learner_left_timestamp_worker_sig,
  //teacher_joined_timestamp_worker_sig, teacher_left_timestamp_worker_sig;

  //let workerPublicAddress = "0xf96d015c2f44c6a608A78857Fa9063790D2908BA"
  /* above are passed in params, must delete before deploy */


export const transferControllerToTeacherAction = `
interface CheckSigsParams {
  role: "teacher" | "learner";
  hashedAddress: string;
  timestamp: string;
  signature: string;
  workerSignature: string;
  workerPublicAddress: string;
};

(async () => {
  const abi = [
    "function transfer(address to, uint256 amount) returns (boolean)"
  ];


  const contract = new ethers.Contract(usdcContractAddress , abi);
  const recipient = teacherAddress;
  const amount = ethers.parseUnits(String(paymentAmount), 6);
  const txData = contract.interface.encodeFunctionData("transfer", [recipient, amount]);

  const txObject = {

    "to": usdcContractAddress,
    "nonce": 0,
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
})();`



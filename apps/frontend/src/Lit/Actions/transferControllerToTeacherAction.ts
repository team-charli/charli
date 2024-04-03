import ethers from 'ethers' //remove in deploy
// export const transferControllerToTeacherAction = `
(async () => {
  const teacherAddress = "0x"
  const hashLearnerAddress = "0x"
  let hashTeacherAddress = "0x"
  const controllerAddress = "0x"
  const controllerPubKey = "0x";
  const paymentAmount=0;
  const usdcContractAddress= "0x"
  const authSig="0x"
  const chain="baseSepolia"
  //sigs


  let learner_joined_timestamp = "2024-03-30T19:53:24.510Z";
  let learner_joined_signature =  '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac0'
  let teacher_joined_timestamp = "2024-03-30T19:53:24.510Z";
  let teacher_joined_signature = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8';
  let learner_left_timestamp = "2024-03-30T20:25:49.773Z"
  let learner_left_signature = '0x57c65f1718e8297f4048beff2419e134656b7a856872b27ad77846e395f13ffe'
  let teacher_left_timestamp = "2024-03-30T20:25:49.773Z"
  let teacher_left_signature = '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32668'

  /* above are passed in params, should delete before deploy */
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
  Lit.Actions.setResponse({ response: JSON.stringify({ txObject }) });
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
  ]
  const checkBothSigned = () => {
    const checkSigs = (role: "teacher" | "learner", hashedAddress: string, timestamp: string, signature: string) => {
      const signerAddress = ethers.verifyMessage(`${timestamp}${role}`, signature);
      if (ethers.keccak256(signerAddress) === hashedAddress) {
        return true;
      } else {
        return false;
      }
    }
    const teacherJoinSigs: boolean = checkSigs("teacher", hashTeacherAddress, teacher_joined_timestamp, teacher_joined_signature)
    const learnerJoinSigs: boolean = checkSigs("learner", hashLearnerAddress, learner_joined_timestamp, learner_joined_signature)
    const teacherLeaveSigs: boolean = checkSigs("teacher", hashTeacherAddress, teacher_left_timestamp, teacher_left_signature)
    const learnerLeaveSigs: boolean = checkSigs("learner", hashLearnerAddress, learner_left_timestamp, learner_left_signature)


    console.log({teacherJoinSigs, learnerJoinSigs, teacherLeaveSigs, learnerLeaveSigs})

    return teacherJoinSigs && learnerJoinSigs && teacherLeaveSigs && learnerLeaveSigs
  }
  const isFunded = await Lit.Actions.checkConditions({conditions, authSig, chain})
  console.log("isFunded: ", isFunded )

  const bothSigned: boolean= checkBothSigned();

  if (isFunded && bothSigned) {
    const sigShare = await Lit.Actions.signEcdsa({
      toSign,
      publicKey: controllerPubKey,
      sigName: "Pay_Teacher_from_Controller",
    });
    console.log('sigShare', sigShare);
  }
})();
// `


import ethers from 'ethers' //remove in deploy
// export const transferControllerToTeacherAction = `
(async () => {
  const teacherAddress = "0x"
  const controllerAddress = "0x"
  const controllerPubKey = "0x";
  const paymentAmount=0;
  const usdcContractAddress= "0x"
  const authSig="0x"
  const chain="baseSepolia"
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

  const bothSigned = () => {

  }
  const isFunded = await Lit.Actions.checkConditions({conditions, authSig, chain})
  console.log("isFunded: ", bothSigned && isFunded )
  if (isFunded) {
    const sigShare = await Lit.Actions.signEcdsa({
      toSign,
      publicKey: controllerPubKey,
      sigName: "Pay_Teacher_from_Controller",
    });
    console.log('sigShare', sigShare);
  }
})();
// `


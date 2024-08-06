// import ethers from 'ethers'
// let learnerAddress='0x'
// let controllerAddress='0x'
// let controllerPubKey='0x'
// let paymentAmount=0
// let usdcContractAddress="0x"
// let chainId=84532;
// let chain = "baseSepolia";
// let authSig="string";
// Above  values should be dynamically passed to the Lit Action through executeJs
// requestedSessionDurationLearnerSig = '0x'
// requestedSessionDurationTeacherSig = '0x'
// hashedLearnerAddress = '0x'
// hashedTeacherAddress = '0x'

//TODO: verify session duration sigs
export const transferFromLearnerToControllerAction = `
(async () => {

  const abi = [
    "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
  ];
  const latestNonce = await LitActions.getLatestNonce({
    address: controllerAddress,
    chain: "chronicle",
  });

  const contract = new ethers.Contract(usdcContractAddress, abi);
  const amount = ethers.parseUnits(paymentAmount.toString(), 6);
  const txData = contract.interface.encodeFunctionData("transferFrom", [learnerAddress, controllerAddress, amount]);

  const txObject = {
    "to": usdcContractAddress,
    "nonce": latestNonce,
    "chainId": chainId,
    "gasLimit": "50000",
    "from": controllerAddress,
    "data": txData,
    "type": 2
  };

  LitActions.setResponse({ response: JSON.stringify({ txObject }) });
  const tx = ethers.Transaction.from(txObject);
  const serializedTx = tx.unsignedSerialized;
  // Use ethers v6 getBytes for rlpEncodedTxn
  const rlpEncodedTxn = ethers.getBytes(serializedTx);
  const unsignedTxn = ethers.keccak256(rlpEncodedTxn);
  const toSign = unsignedTxn;
  const conditions = [
    {
      contractAddress: usdcContractAddress,
      standardContractType: "ERC20",
      chain,
      method: "allowance",
      parameters: [learnerAddress, ':userAddress' ],
      returnValueTest: {
        comparator: '>=',
        value: ethers.formatUnits(paymentAmount, 6)
      }
    }
  ];

  const learnerAllowedAmount: boolean = await LitActions.checkConditions({conditions, authSig, chain})

  if (learnerAllowedAmount) {
    const sigShare = await LitActions.signEcdsa({
      toSign,
      publicKey: controllerPubKey,
      sigName: "sign_transfer_from",
    });

    console.log('Signature for transferFrom:', sigShare);
  }
})();
`


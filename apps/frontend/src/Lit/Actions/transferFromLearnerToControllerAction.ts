export const transferFromLearnerToControllerAction = `
async () => {
  let learnerAddress
  let controllerAddress
  let controllerPubKey
  let paymentAmount=0
  let usdcContractAddress="0x"
  let chainId
  // Above  values should be dynamically passed to the Lit Action through executeJs


  const abi = [
    "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
  ];
  const latestNonce = await Lit.Actions.getLatestNonce({
    address: controllerAddress,
    chain: "chronicle",
  });

  const contract = new ethers.Contract(usdcContractAddress, abi);

  const amount = ethers.parseUnits(paymentAmount.toString(), 6);

  const txData = contract.interface.encodeFunctionData("transferFrom", [learnerAddress, controllerAddress, amount]);

  const txObject = {
    "to": usdcContractAddress,
    "nonce": latestNonce,
    "chainId": 84532,
    "gasLimit": "50000",
    "from": controllerAddress,
    "data": txData,
    "type": 2
    chainId
  };

  Lit.Actions.setResponse({ response: JSON.stringify({ txObject }) });
  const tx = ethers.Transaction.from(txObject);
  const serializedTx = tx.unsignedSerialized;
  // Use ethers v6 getBytes for rlpEncodedTxn
  const rlpEncodedTxn = ethers.getBytes(serializedTx);
  const unsignedTxn = ethers.keccak256(rlpEncodedTxn);
  const toSign = unsignedTxn;

  const sigShare = await LitActions.signEcdsa({
    toSign,
    publicKey: controllerPubKey,
    sigName: "sign_transfer_from",
  });

  console.log('Signature for transferFrom:', sigShare);
}
`


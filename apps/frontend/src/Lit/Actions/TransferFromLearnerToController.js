export const transferFromLearnerToController = `async () =>
/*
  const learnerAddress = "0x";
  const controllerAddress = "0x";
  const controllerPubKey = "0x";
  const paymentAmount = "AMOUNT";

  Above  values should be dynamically passed to the Lit Action through executeJs */

  const usdcContractAddress = "YOUR_CONTRACT_ADDRESS_HERE";
  const abi = [
    "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
  ];

  const contract = new ethers.Contract(usdcContractAddress, abi, signer);

  const amount = ethers.utils.parseUnits(paymentAmount.toString(), 6);

  const txData = contract.interface.encodeFunctionData("transferFrom", [learnerAddress, controllerAddress, amount]);

  const txObject = {
    "to": usdcContractAddress,
    "nonce": 0,
    "chainId": 84532,
    "gasLimit": "50000",
    "from": controllerAddress,
    "data": txData,
    "type": 2
  };

  const tx = ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.serializeTransaction(txObject)));
  const sigShare = await LitActions.signEcdsa({
    toSign: tx,
    publicKey: controllerPubKey,
    sigName: "sign_transfer_from",
  });

  console.log('Signature for transferFrom:', sigShare);
`


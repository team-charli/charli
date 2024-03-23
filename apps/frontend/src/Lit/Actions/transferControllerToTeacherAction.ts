export const transferControllerToTeacherAction = `(async () => {
  const teacherAddress = "0x"
  const controllerAddress = "0x"
  const controllerPubKey = "0x";
  const paymentAmount=0;
  const usdcContractAddress="0x"
/* above are passed in params, should delete before deploy */
  const abi = [
    "function transfer(address to, uint256 amount) returns (boolean)"
  ];

  const usdcContractAddress = "YOUR_CONTRACT_ADDRESS";

  const contract = new ethers.Contract(usdcContractAddress , abi);
  const recipient = teacherAddress;
  const amount = ethers.utils.parseUnits(paymentAmount, 6);
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

  const tx = ethers.utils.arrayify(ethers.utils.keccak256(txObject))
  const sigShare = await LitActions.signEcdsa({
    toSign: tx,
    publicKey: controllerPubKey,
    sigName: "Pay_Teacher_from_Controller",
  });

  console.log('sigShare', sigShare);
})();`


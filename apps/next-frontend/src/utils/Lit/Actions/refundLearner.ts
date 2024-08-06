// types.d.ts or at the top of a relevant .ts file
// declare const ethers: typeof import("ethers");
// declare const LitActions: any; // Specify a more specific type if available
// const usdcContractAddress = "0x";
// const learnerAddress = "0x";
// const refundAmount = 0;
// const authSig="0x"
// const chain="baseSepolia"
// const chainId="84532"
// const controllerAddress="0x"
// const controllerPubKey = "0x";
// let signedReason = "";

//Above values are for development only
// const refundLearner = () => {
  // (async () => {
  //   const abi = [ "function transfer(address to, uint256 amount) returns (boolean)" ];

  //   const contract = new ethers.Contract(usdcContractAddress, abi);
  //   const recipient = learnerAddress;
  //   const amount = ethers.parseUnits(String(refundAmount), 6);
  //   const txData = contract.interface.encodeFunctionData("transfer", [recipient, amount]);
  //   const latestNonce = await LitActions.getLatestNonce({ address: controllerAddress, chain });
  //   const txObject = {
  //     "to": usdcContractAddress,
  //     "from": controllerAddress,
  //     "nonce": latestNonce,
  //     "chainId": chainId,
  //     "gasLimit": "50000",
  //     "data": txData,
  //     "type": 2
  //   }

  //   LitActions.setResponse({ response: JSON.stringify({ txObject }) });
  //   const tx = ethers.Transaction.from(txObject);
  //   const serializedTx = tx.unsignedSerialized;
  //   const rlpEncodedTxn = ethers.getBytes(serializedTx);
  //   const unsignedTxn = ethers.keccak256(rlpEncodedTxn);
  //   const toSign = unsignedTxn;
  //   const conditions = [
  //     {
  //       contractAddress: usdcContractAddress,
  //       standardContractType: "ERC20",
  //       chain,
  //       method: "balanceOf",
  //       parameters: [':userAddress' ],
  //       returnValueTest: {
  //         comparator: '>=',
  //         value: ethers.formatUnits(refundAmount, 6)
  //       }
  //     }
  //   ];

  //   const reasonValid = () => {
  //     if (signedReason){
  //       return true;
  //     } else {
  //       return false;
  //     }
  //   }
  //   const isFunded : boolean = await LitActions.checkConditions({conditions, authSig, chain})

  //   if (reasonValid() && isFunded) {
  //     const sigShare = await LitActions.signEcdsa({
  //       toSign,
  //       publicKey: controllerPubKey,
  //       sigName: "Refund_Learner",
  //     });

  //   }
  // })();
// }

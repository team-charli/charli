// declare const ethers: any
// let learnerAddress='0x'
// let controllerAddress='0x'
// let controllerPubKey='0x'
// let paymentAmount=0
// let usdcContractAddress="0x"
// let chainId=84532;
// let chain = "sepolia";
// let authSig="string";
// let requestedSessionDurationLearnerSig:string;
// let requestedSessionDurationTeacherSig: string;
// let sessionDuration: string;
// let hashedLearnerAddress: string;
// let hashedTeacherAddress: string;
// declare const LitActions: any;

// Above  values should be dynamically passed to the Lit Action through executeJs they are included here to avoid triggering ide diagnostics

export const transferFromLearnerToControllerAction = `
(async () => {
  const verifyDuration = () => {
    const teacherAddress = ethers.verifyMessage(String(sessionDuration), requestedSessionDurationTeacherSig);
    const learnerAddress = ethers.verifyMessage(String(sessionDuration), requestedSessionDurationLearnerSig);

    const teacherSignedDuration: boolean =  hashedTeacherAddress === ethers.keccak256(teacherAddress);
    const learnerSignedDuration: boolean = hashedLearnerAddress === ethers.keccak256(hashedLearnerAddress);

    //redundant checks for visibility; check made before join session
    if (!teacherSignedDuration) {
      LitActions.setResponse({ response: JSON.stringify({ error: "teacher never signed session duration" }) });
      throw new Error()
    } else if (!learnerSignedDuration) {
      LitActions.setResponse({ response: JSON.stringify({ error: "learner never signed session duration" }) });
      throw new Error()
    }
  }
  verifyDuration();

  const abi = [
    "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
  ];

  const latestNonce = await LitActions.getLatestNonce({
    address: controllerAddress,
    chain: "chronicle",
  });

  const contract = new ethers.Contract(usdcContractAddress, abi);
  const amount = ethers.utils.parseUnits(paymentAmount.toString(), 6);
  const txData = contract.interface.encodeFunctionData("transferFrom", [learnerAddress, controllerAddress, amount]);

  const txObject = {
    to: usdcContractAddress,
    nonce: latestNonce,
    chainId: chainId,
    gasLimit: ethers.utils.hexlify(50000),
    from: controllerAddress,
    data: txData,
    type: 2
  };

  const unsignedTx = await ethers.utils.resolveProperties(txObject);
  const serializedTx = ethers.utils.serializeTransaction(unsignedTx);
  const unsignedTxn = ethers.utils.keccak256(serializedTx);
  const toSign = ethers.utils.arrayify(unsignedTxn);

  const conditions = [
    {
      contractAddress: usdcContractAddress,
      standardContractType: "ERC20",
      chain,
      method: "allowance",
      parameters: [learnerAddress, ':userAddress'],
      returnValueTest: {
        comparator: '>=',
        value: ethers.utils.formatUnits(amount, 6)
      }
    }
  ];

  const learnerAllowedAmount = await LitActions.checkConditions({conditions, authSig, chain});



  if (learnerAllowedAmount) {
    const signature = await LitActions.signAndCombineEcdsa({
      toSign,
      publicKey: controllerPubKey,
      sigName: "sign_transfer_from",
    });

    console.log('Signature for transferFrom:', signature);

    const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);

    const forwardTxToRelayerRes = await LitActions.runOnce({
      waitForResponse: true,
      name: "forwardTxToRelayer"
    }, async () => {
        const url = 'https://relayer.zach-greco.workers.dev';
        const body = JSON.stringify({
          signedTx,
          expectedSender: controllerAddress,
          usdcContractAddress,
          learnerAddress,
          controllerAddress,
          paymentAmount: amount.toString()
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body
        });

        if (!response.ok) {
          throw new Error("HTTP error! status:, response.status");
        }

        return await response.json();
      });

    LitActions.setResponse({ response: JSON.stringify(forwardTxToRelayerRes) });
  } else {
    LitActions.setResponse({ response: JSON.stringify({ error: "ACC failed: Insufficient allowance" }) });
  }
})();
`


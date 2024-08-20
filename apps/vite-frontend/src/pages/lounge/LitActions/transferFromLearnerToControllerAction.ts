// @ts-nocheck
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
const verifyDurationAndId = () => {
  // Encode the data
  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ["string", "uint256"],
    [sessionId, sessionDuration]
  );

  // Hash the encoded data
  const message = ethers.utils.keccak256(encodedData);

  // Recover the addresses from the signatures
  const recoveredLearnerAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), requestedSessionDurationLearnerSig);
  const recoveredTeacherAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), requestedSessionDurationTeacherSig);

  // Hash the recovered addresses
  const hashedRecoveredLearnerAddress = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(recoveredLearnerAddress));
  const hashedRecoveredTeacherAddress = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(recoveredTeacherAddress));

  // Compare the hashed recovered addresses with the provided hashed addresses
  const learnerSignedDuration = hashedLearnerAddress === hashedRecoveredLearnerAddress;
  const teacherSignedDuration = hashedTeacherAddress === hashedRecoveredTeacherAddress;

  if (!learnerSignedDuration || !teacherSignedDuration) {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Invalid signatures or addresses don't match" }) });
    throw new Error("Invalid signatures or addresses don't match");
  }
}
  verifyDurationAndId();

  const abi = [
    "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
  ];

  const latestNonce = await Lit.Actions.getLatestNonce({
    address: controllerAddress,
    chain: "chronicle",
  });

  const contract = new ethers.Contract(usdcContractAddress, abi);
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
    parameters: [learnerAddress, controllerAddress],
    returnValueTest: {
      comparator: '>=',
      value: ethers.utils.formatUnits(amount, 6)
    }
  }
];

  const learnerAllowedAmount = await Lit.Actions.checkConditions({conditions, authSig, chain});



  if (learnerAllowedAmount) {
    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign,
      publicKey: controllerPubKey,
      sigName: "sign_transfer_from",
    });

    console.log('Signature for transferFrom:', signature);

    const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);

    const forwardTxToRelayerRes = await Lit.Actions.runOnce({
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

    Lit.Actions.setResponse({ response: JSON.stringify(forwardTxToRelayerRes) });
  } else {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "ACC failed: Insufficient allowance" }) });
  }
})();
`


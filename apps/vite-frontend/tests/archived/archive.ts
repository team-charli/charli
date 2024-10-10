test.skip("has all jsParams properties defined", () => {
  const jsParams = {
    keyId,
    ipfsId,
    userId,
    learnerAddressCiphertext,
    learnerAddressEncryptHash,
    controllerAddress,
    controllerPubKey,
    usdcContractAddress,
    chain,
    chainId,
    sessionDataLearnerSig,
    sessionDataTeacherSig,
    sessionDuration,
    secureSessionId,
    hashedLearnerAddress,
    hashedTeacherAddress,
    amount,
    accessControlConditions
  };

  const undefinedProps: string[] = [];

  for (const [key, value] of Object.entries(jsParams)) {
    try {
      expect(value).toBeDefined();
    } catch (error) {
      undefinedProps.push(key);
    }
  }

  if (undefinedProps.length > 0) {
    throw new Error(`The following properties are undefined: ${undefinedProps.join(', ')}`);
  }
});

test.skip("log params in Lit Action", async () => {
  const jsParams =  {
    keyId,
    ipfsId,
    userId,
    learnerAddressCiphertext,
    learnerAddressEncryptHash,
    controllerAddress,
    controllerPubKey,
    usdcContractAddress,
    chain,
    chainId,
    sessionDataLearnerSig,
    sessionDataTeacherSig,
    sessionDuration,
    secureSessionId,
    hashedLearnerAddress,
    hashedTeacherAddress,
    amount,
    accessControlConditions
  }
  console.log("jsParams", jsParams)
  await litNodeClient.executeJs({
    ipfsId: "QmUDrRKS3CustSrbanNuSCmZ8ugqSfYeXPFMk25zVRV1f1",
    sessionSigs,
    jsParams
  })
})
test.skip("test basic action response", async () => {
  await litNodeClient.executeJs({
    ipfsId: "QmU3GNi4bUeMfLxULkrkG8kyFpb1yzxu81oqnydUF6wLWe",
    sessionSigs,
    jsParams: {
      param: "zero"
    }
  })
})


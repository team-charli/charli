// @ts-nocheck
//ipfs://QmVsArWZgnAWVU5kSuPjXpgVu4PfZe3vpbFZmTVzFMuiYX
const transferFromLearnerToControllerAction =
async () => {
  try {
    const verifyDurationAndId = () => {
      console.log("Input values:", {
        secureSessionId,
        sessionDuration,
        sessionDataLearnerSig,
        sessionDataTeacherSig,
        hashedLearnerAddress,
        hashedTeacherAddress
      });

      // Encode the data
      const encodedData = ethers.utils.concat([
        ethers.utils.toUtf8Bytes(secureSessionId),
        ethers.utils.hexlify(ethers.BigNumber.from(sessionDuration))
      ]);

      // Hash the encoded data
      const message = ethers.utils.keccak256(encodedData);

      // Recover the addresses from the signatures
      const recoveredLearnerAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sessionDataLearnerSig);
      const recoveredTeacherAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sessionDataTeacherSig);

      // Hash the recovered addresses
      const hashedRecoveredLearnerAddress = ethers.utils.keccak256(recoveredLearnerAddress);
      const hashedRecoveredTeacherAddress = ethers.utils.keccak256(recoveredTeacherAddress);

      // Compare the hashed recovered addresses with the provided hashed addresses
      const learnerSignedDuration = hashedLearnerAddress === hashedRecoveredLearnerAddress;
      const teacherSignedDuration = hashedTeacherAddress === hashedRecoveredTeacherAddress;

      if (!learnerSignedDuration || !teacherSignedDuration) {
        console.error("Verification failed. Mismatched values:", {
          hashedLearnerAddress,
          hashedRecoveredLearnerAddress,
          hashedTeacherAddress,
          hashedRecoveredTeacherAddress
        });
        Lit.Actions.setResponse({ response: JSON.stringify({ error: "Invalid signatures or addresses don't match" }) });
        throw new Error("Invalid signatures or addresses don't match");
      }

      console.log("verifyDurationAndId success");
    };
    verifyDurationAndId();
    let decryptedLearnerAddress;
    const decryptLearnerAddress = async () => {
      decryptedLearnerAddress = await Lit.Actions.decryptAndCombine
      ({
          ciphertext: learnerAddressCiphertext,
          dataToEncryptHash: learnerAddressEncryptHash,
          authSig: null,
          chain: "ethereum",
          accessControlConditions
        })

      if (decryptedLearnerAddress.length > 10) {
        console.log("Successfully Decrypted learner address");
      }
      console.log("decryptedLearnerAddress: ", JSON.stringify(decryptedLearnerAddress));
    }
    await decryptLearnerAddress();

    const abi = [ "function transferFrom(address from, address to, uint256 value) returns (bool)" ];

    const contract = new ethers.Contract(daiContractAddress, abi);
    const amountBigNumber = ethers.utils.parseUnits(amount, 6);

    const txData = contract.interface.encodeFunctionData("transferFrom", [decryptedLearnerAddress, controllerAddress, amountBigNumber]);

    const submitRelayTx = async () => {
      try {
        await Lit.Actions.call({ipfsId: relayerIpfsId,
          params: {
            env,
            callingActionId: Lit.Auth.actionIpfsIds[0],
            rpcChain,
            rpcChainId,
            accessControlConditions,
            daiContractAddress,
            txData,
            learnerAddressCiphertext,
            learnerAddressEncryptHash,
          }});
      } catch(error) {
        throw new Error(error);
      }
    }
    const relayedTxHash = await submitRelayTx();

    //TODO: decrypt ipfs api key in action and post transaction to ipfs
    // let ipfsHash;
    // try {
    //   fetchResult = await Lit.Actions.runOnce({
    //     waitForResponse: true,
    //     name: "call pinDataWithAction function"
    //   }, async () => {
    //       await fetch({
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ linkData })
    //       });

    //       const data = await response.json();
    //       ipfsHash = data.ipfsHash;
    //       console.log(`Data stored on IPFS: ${ipfsHash}`);
    //     })
    // } catch (error) {
    //   console.error('Failed to store data on IPFS:', error);
    // }
    // const linkData = {
    //   relayedTxHash,
    //   learnerAddress: decryptedLearnerAddress,
    //   controllerAddress: controllerAddress,
    //   amount: amount,
    //   daiContractAddress: daiContractAddress,
    //   sessionId: sessionId,
    //   timestamp: Date.now()
    // };


    // Lit.Actions.setResponse({
    //   response: JSON.stringify({
    //     success: true,
    //     relayedTxHash,
    //     ipfsHash: ipfsHash
    //   })
    // });

  } catch (error) {
    console.error("Uncaught error in transferFromLearnerToControllerAction function:", error);
  }
};
transferFromLearnerToControllerAction();

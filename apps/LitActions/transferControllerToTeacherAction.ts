// ipfsId: QmdGqVdeeTC9xq9CCFhmJUanABaCH8PKYnXsY7QtU5V6ui
/**
 * Expected parameters passed to this Lit Action:
 *
 * @param {Object} sessionData
 *   The raw session data compiled by the Durable Object (DO). Must contain fields like `teacherData`, `learnerData`, `scenario`, `timestamp`, and `roomId`.
 *
 * @param {string} sessionDataSignature
 *   An ECDSA signature over `sessionData` produced by the DO. The Lit Action will verify this.
 *
 * @param {string} teacherAddressCiphertext
 *   The encrypted teacher's address (ciphertext).
 *
 * @param {string} teacherAddressEncryptHash
 *   The hash used for teacher address decryption.
 *
 * @param {string} learnerAddressCiphertext
 *   The encrypted learner's address (ciphertext).
 *
 * @param {string} learnerAddressEncryptHash
 *   The hash used for learner address decryption.
 *
 * @param {string} controllerAddress
 *   Ethereum address of the PKP or account that holds the DAI funds.
 *
 * @param {string} finalizeEdgeAddress
 *   Ethereum address of the wallet used to generate sessionDataSignature in session-time-tracker
 *
 * @param {Object} accessControlConditions
 *   The conditions under which Lit can decrypt the addresses.
 *
 * @param {string} daiContractAddress
 *   (Optional) Address of the DAI token contract if you need to perform ERC20 transfers.
 *
 * @param {string} relayerIpfsId
 *   IPFS CID of the separate relayer action called by `Lit.Actions.call()`.
 *
 * @param {string} env
 *   Environment identifier (e.g., 'dev'), if needed by the relayer or other logic.
 *
 * @param {string} rpcChain
 *   A chain key recognized by `Lit.Actions.getRpcUrl({ chain: rpcChain })`.
 *
 * @param {number} rpcChainId
 *   The numeric chain ID for the target network (e.g., 5 for Goerli).
 */
// @ts-nocheck
const transferControllerToTeacherAction = async () => {
  console.log("Starting transferControllerToTeacherAction");

  try {
    // Below are the parameters passed to this Lit Action

    // 1. Verify the DO’s signature over sessionData.
    //    This checks that sessionData was indeed signed by the DO’s private key.
    const sessionDataString = JSON.stringify(sessionData);
    const recoveredAddress = ethers.utils.verifyMessage(sessionDataString, sessionDataSignature);

    console.log("Recovered address =>", recoveredAddress);
    if (recoveredAddress.toLowerCase() !== finalizeEdgeAddress.toLowerCase()) {
      throw new Error("Signature mismatch: sessionData not from expected DO.");
    }

    // 2. Prepare your chain + DAI contract
    //    (We assume `ethers` is v5 here, which is included in the Lit Action environment.)
    const daiAbi = [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 value) returns (bool)"
    ];
    const rpcUrl = await Lit.Actions.getRpcUrl({ chain: rpcChain });
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const daiContract = new ethers.Contract(daiContractAddress, daiAbi, provider);

    // 3. Check how much DAI is in the controller
    const amountBigNumber = await daiContract.balanceOf(controllerAddress);
    console.log("Controller DAI balance =>", amountBigNumber.toString());

    // 4. Decrypt teacher + learner addresses
    console.log("Decrypting addresses...");
    const decryptedTeacherAddress = await Lit.Actions.decryptAndCombine({
      ciphertext: teacherAddressCiphertext,
      dataToEncryptHash: teacherAddressEncryptHash,
      chain: "ethereum",
      accessControlConditions
    });
    const decryptedLearnerAddress = await Lit.Actions.decryptAndCombine({
      ciphertext: learnerAddressCiphertext,
      dataToEncryptHash: learnerAddressEncryptHash,
      chain: "ethereum",
      accessControlConditions
    });
    console.log("Decrypted addresses:", {
      teacher: decryptedTeacherAddress,
      learner: decryptedLearnerAddress
    });

    // 5. Decide who to pay
    //    If scenario=non_fault => pay teacher,
    //    If teacher is fault => pay learner, etc.
    const { teacherData, learnerData, scenario } = sessionData;
    let recipientAddress;
    if (scenario === "non_fault") {
      recipientAddress = decryptedTeacherAddress;
    } else {
      recipientAddress = teacherData?.isFault ? decryptedLearnerAddress : decryptedTeacherAddress;
    }

    console.log(`Recipient address => ${recipientAddress}`);

    // 6. Encode the ERC20 transfer
    const txData = daiContract.interface.encodeFunctionData("transfer", [
      recipientAddress,
      amountBigNumber
    ]);

    // 7. Relay the tx using your separate relayer Lit Action or logic
    //    (We call the pinned relayer action with ipfsId = relayerIpfsId)
    const submitRelayTx = async () => {
      try {
        return await Lit.Actions.call({
          ipfsId: relayerIpfsId,
          params: {
            env,
            callingActionId: Lit.Auth.actionIpfsIds[0],
            rpcChain,
            rpcChainId,
            daiContractAddress,
            txData,
            controllerAddress
          }
        });
      } catch (error) {
        throw new Error(`Relay transaction failed: ${error.message}`);
      }
    };
    const relayedTxHash = await submitRelayTx();
    console.log("Relayed txHash =>", relayedTxHash);

    // 8. If success, respond with success
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        relayedTxHash,
        recipientAddress,
        scenario
      })
    });
  } catch (error) {
    console.error("Error in transferControllerToTeacherAction:", error);
    // Return error
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

// Finally, run it
transferControllerToTeacherAction();

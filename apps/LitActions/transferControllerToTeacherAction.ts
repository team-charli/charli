// @ts-nocheck: no lit action types
// ipfsId: QmcZXhjC4U3DbHo6V8NFdaMtkbaKYvjKHwqTf9fghNS3S5
/**
 * Expected parameters to be passed to this Lit Action:
 * @param {string} ipfsCid - IPFS CID containing the session outcome data
 * @param {string} teacherAddressCiphertext - Encrypted teacher's Ethereum address
 * @param {string} teacherAddressEncryptHash - Hash used for teacher address decryption
 * @param {string} learnerAddressCiphertext - Encrypted learner's Ethereum address
 * @param {string} learnerAddressEncryptHash - Hash used for learner address decryption
 * @param {string} controllerAddress - Ethereum address of the controller PKP holding the funds
 * @param {string} daiContractAddress - Address of the DAI token contract
 * @param {string} relayerIpfsId - IPFS CID of the relayer action
 * @param {string} env - Environment identifier (e.g. 'dev')
 * @param {string} rpcChain - RPC chain identifier
 * @param {number} rpcChainId - Chain ID for the network
 * @param {Object} accessControlConditions - Conditions for address decryption
 */

// @ts-nocheck
const transferControllerToTeacherAction = async () => {
  console.log("Starting transferControllerToTeacherAction");

  try {
    // 1. Fetch session data from IPFS (no runOnce)
    const fetchSessionDataIPFS = async () => {
      const url = `https://chocolate-deliberate-squirrel-286.mypinata.cloud/ipfs/${ipfsCid}`;
      console.log("Fetching IPFS URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch IPFS data: ${response.status} ${response.statusText}`);
      }

      const rawText = await response.text();
      console.log("sessionData raw text:", rawText);

      const parsed = JSON.parse(rawText);
      if (!parsed?.teacherData) {
        throw new Error("No teacherData in pinned session");
      }

      // If all good, return the parsed object
      console.log("sessionData parsed JSON:", JSON.stringify(parsed, null, 2));
      return parsed;
    };

    const sessionData = await fetchSessionDataIPFS();

    // 2. Prepare your chain + DAI contract
    const daiAbi = [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 value) returns (bool)"
    ];
    const rpcUrl = await Lit.Actions.getRpcUrl({ chain: rpcChain });
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const daiContract = new ethers.Contract(daiContractAddress, daiAbi, provider);

    // 3. Check how much DAI is in the controller
    const amountBigNumber = await daiContract.balanceOf(controllerAddress);

    // 4. Decrypt teacher + learner addresses
    console.log({
      teacherAddressCiphertext,
      teacherAddressEncryptHash,
      learnerAddressCiphertext,
      learnerAddressEncryptHash
    });

    const decryptedTeacherAddress = await Lit.Actions.decryptAndCombine({
      ciphertext: teacherAddressCiphertext,
      dataToEncryptHash: teacherAddressEncryptHash,
      authSig: null,
      chain: "ethereum",
      accessControlConditions
    });
    const decryptedLearnerAddress = await Lit.Actions.decryptAndCombine({
      ciphertext: learnerAddressCiphertext,
      dataToEncryptHash: learnerAddressEncryptHash,
      authSig: null,
      chain: "ethereum",
      accessControlConditions
    });
    console.log("Successfully decrypted addresses:", {
      teacher: decryptedTeacherAddress,
      learner: decryptedLearnerAddress
    });

    // 5. Decide who to pay based on sessionData
    const { teacherData, learnerData, scenario } = sessionData;
    let recipientAddress;
    if (scenario === 'non_fault') {
      recipientAddress = decryptedTeacherAddress;
    } else {
      // If teacher is at fault => pay learner, otherwise pay teacher
      recipientAddress = teacherData.isFault
        ? decryptedLearnerAddress
        : decryptedTeacherAddress;
    }

    // 6. Encode transfer
    const txData = daiContract.interface.encodeFunctionData("transfer", [
      recipientAddress,
      amountBigNumber
    ]);

    // 7. Relay the tx
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

    // 8. Send success response
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        relayedTxHash,
        recipientAddress,
        scenario
      })
    });

  } catch (error) {
    // If we fail anywhere in the above try, respond with error
    console.error("Error in transferControllerToTeacherAction:", error);
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

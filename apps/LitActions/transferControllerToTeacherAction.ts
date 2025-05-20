// @ts-nocheck: no lit action types
// ipfsId: QmUkQ8Jh1eAxKoy4DovYQ1PDwepserJWRbz6JWe7jjLYfC
/**
 * Expected parameters to be passed to this Lit Action:
 * @param {string} ipfsCid - IPFS CID containing the session outcome data
 * @param {string} teacherAddressCiphertext - Encrypted teacher's Ethereum address
 * @param {string} teacherAddressEncryptHash - Hash used for teacher address decryption
 * @param {string} learnerAddressCiphertext - Encrypted learner's Ethereum address
 * @param {string} learnerAddressEncryptHash - Hash used for learner address decryption
 * @param {string} controllerAddress - Ethereum address of the controller PKP holding the funds
 * @param {string} usdcContractAddress - Address of the USDC token contract
 * @param {string} relayerIpfsId - IPFS CID of the relayer action
 * @param {string} env - Environment identifier (e.g. 'dev')
 * @param {string} rpcChain - RPC chain identifier
 * @param {number} rpcChainId - Chain ID for the network
 * @param {Object} accessControlConditions - Conditions for address decryption
 */

const transferControllerToTeacherAction = async () => {
  console.log("Starting transferControllerToTeacherAction");
  try {
    const fetchSessionDataIPFS = async () => {
      try {
        const sessionData = await Lit.Actions.runOnce({
          waitForResponse: true,
          name: "fetchIPFS"
        }, async () => {
            const response = await fetch(`https://ipfs.io/ipfs/${ipfsCid}`);
            return await response.json();
          });
        console.log("Session data fetched:", sessionData);
        return sessionData;
      } catch (error) {
        throw new Error(`Failed to fetch session data: ${error.message}`);
      }
    };


    const usdcAbi = ["function balanceOf(address) view returns (uint256)", "function transfer(address to, uint256 value) returns (bool)"];
    const rpcUrl = await Lit.Actions.getRpcUrl(rpcChain)
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const usdcContract = new ethers.Contract(usdcContractAddress, usdcAbi, provider);

    const amountBigNumber = await usdcContract.balanceOf(controllerAddress);

    // Decrypt teacher and learner addresses
    let decryptedTeacherAddress, decryptedLearnerAddress;
    const decryptAddresses = async () => {
      decryptedTeacherAddress = await Lit.Actions.decryptAndCombine({
        ciphertext: teacherAddressCiphertext,
        dataToEncryptHash: teacherAddressEncryptHash,
        authSig: null,
        chain: "ethereum",
        accessControlConditions
      });

      decryptedLearnerAddress = await Lit.Actions.decryptAndCombine({
        ciphertext: learnerAddressCiphertext,
        dataToEncryptHash: learnerAddressEncryptHash,
        authSig: null,
        chain: "ethereum",
        accessControlConditions
      });

      if (decryptedTeacherAddress.length > 10 && decryptedLearnerAddress.length > 10) {
        console.log("Successfully decrypted addresses");
      }
    };
    await decryptAddresses();

    // Get session data and determine recipient
    const sessionData = await fetchSessionDataIPFS();
    const { teacherData, learnerData, scenario } = sessionData;

    let recipientAddress;
    if (scenario === 'non_fault') {
      recipientAddress = decryptedTeacherAddress;
    } else {
      // In fault case, send to the non-faulting party
      recipientAddress = teacherData.isFault ? decryptedLearnerAddress : decryptedTeacherAddress;
    }

    // Set up USDC transfer
    const txData = usdcContract.interface.encodeFunctionData("transfer", [
      recipientAddress,
      amountBigNumber
    ]);

    // Submit transaction through relayer
    const submitRelayTx = async () => {
      try {
        return await Lit.Actions.call({
          ipfsId: relayerIpfsId,
          params: {
            env,
            callingActionId: Lit.Auth.actionIpfsIds[0],
            rpcChain,
            rpcChainId,
            usdcContractAddress,
            txData,
            controllerAddress
          }
        });
      } catch (error) {
        throw new Error(`Relay transaction failed: ${error.message}`);
      }
    };

    const relayedTxHash = await submitRelayTx();

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
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

transferControllerToTeacherAction();

// @ts-nocheck
const permitAction = async () => {
  console.log("Starting permitAction");
  try {
    // Verify session duration and secure ID
    const verifySessionDurationAndSecureId = () => {
      const encodedData = ethers.utils.concat([
        ethers.utils.toUtf8Bytes(secureSessionId),
        ethers.utils.hexlify(ethers.BigNumber.from(duration))
      ]);
      const message = ethers.utils.keccak256(encodedData);
      const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sessionIdAndDurationSig);
      if (recoveredAddress.toLowerCase() !== learnerAddress.toLowerCase()) {
        throw new Error("Invalid session duration signature");
      }
    };
    verifySessionDurationAndSecureId();

    // Correct function signature based on the ABI
    const permitFunctionSignature = "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)";

    // Create the function selector (first 4 bytes of the hash of the function signature)
    const permitSelector = ethers.utils.id(permitFunctionSignature).slice(0, 10);

    // Encode the function parameters according to the ABI
    const permitData = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint256', 'uint256', 'uint8', 'bytes32', 'bytes32'],
      [owner, spender, value, deadline, v, r, s]
    );

    // Concatenate the selector and the encoded parameters to form the complete transaction data
    const permitTxData = ethers.utils.hexConcat([permitSelector, permitData]);

    // Call the Relayer Action to send the transaction
    console.log("Calling Relayer Action");
    const relayerResponse = await Lit.Actions.call({
      ipfsId: relayerIpfsId,
      params: {
        env: env,
        callingActionId: Lit.Auth.actionIpfsIds[Lit.Auth.actionIpfsIds.length - 1],
        txData: permitTxData,
        daiContractAddress: daiContractAddress,
        rpcChain: rpcChain,
        rpcChainId: rpcChainId,
      },
    });

    console.log("Relayer Action response:", relayerResponse);

    // Set the Response directly from the relayer's response
    Lit.Actions.setResponse({
      response: JSON.stringify(relayerResponse)
    });

  } catch (error) {
    console.error('Error in permitAction:', error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

permitAction();


// @ts-nocheck
// ipfsId: QmRsxUny7KEu1EEr4ftLJy4K6mz82GxbnUaUFzLYRkRUk7
// Example usage in your test:
//   await litNodeClient.executeJs({
//     ipfsId: checkOrResetNonceIpfsId,
//     jsParams: { env: 'dev', rpcChain: 'baseSepolia', rpcChainId: '84532', forceReset: false },
//     sessionSigs: ...
//   });

const checkOrResetNonceAction = async () => {
  try {
    console.log("Starting checkOrResetNonceAction");

    if (!env) throw new Error("env parameter is missing");
    if (!rpcChain) throw new Error("rpcChain parameter is missing");
    if (!rpcChainId) throw new Error("rpcChainId parameter is missing");

    let relayerAddress, publicKey;
    if (env === "dev") {
      relayerAddress = "0x67a7c841bB16e62b68f214961CA8738Bdc7bCd02";
      publicKey = "041c0f79e93c4777bf9858a20b123436e3b72819b86970b78bd23715da3197e9f487907d835fac8f1825412091506040cb7085e3e913ff9ddecccae9ddfed89567";
    } else {
      throw new Error(`Invalid env: ${env}. Only 'dev' is currently supported.`);
    }

    const rpcUrl = await Lit.Actions.getRpcUrl({ chain: rpcChain });
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // 1) Get the chain’s next nonce from Lit
    const chainNonceHex = await Lit.Actions.getLatestNonce({
      address: relayerAddress,
      chain: rpcChain,
    });
    const chainNonceLit = parseInt(chainNonceHex, 16);

    // 2) Cross-check with Ethers (pending nonce)
    const chainNonceEthers = await provider.getTransactionCount(relayerAddress, "pending");

    console.log(`Lit getLatestNonce => ${chainNonceHex} (decimal: ${chainNonceLit})`);
    console.log(`Ethers getTransactionCount => ${chainNonceEthers}`);

    // Decide if we need to do a cancel transaction
    let mismatch = chainNonceLit !== chainNonceEthers;

    if (!forceReset && !mismatch) {
      // All good, no forced reset
      console.log("No mismatch found and forceReset=false => no reset needed.");
      Lit.Actions.setResponse({
        response: JSON.stringify({
          success: true,
          message: "Nonce check passed. No reset required.",
          chainNonceLit,
          chainNonceEthers,
        }),
      });
      return;
    }

    // Otherwise, we do a "cancel" TX on chainNonceLit
    console.log(`Mismatch or forceReset=true => Attempting to cancel nonce = ${chainNonceLit}`);

    const cancelTx = {
      to: relayerAddress,
      value: ethers.utils.parseEther("0"),
      nonce: chainNonceLit,
      chainId: parseInt(rpcChainId),
      type: 2,
      gasLimit: ethers.BigNumber.from("21000").toHexString(),
      // Use higher fees so it mines quickly
      maxFeePerGas: ethers.utils.parseUnits("50", "gwei").toHexString(),
      maxPriorityFeePerGas: ethers.utils.parseUnits("3", "gwei").toHexString(),
    };

    const toSign = ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.serializeTransaction(cancelTx))
    );
    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign,
      publicKey,
      sigName: "sig_cancel",
    });

    // Convert signature from JSON
    const jsonSignature = JSON.parse(signature);
    jsonSignature.r = "0x" + jsonSignature.r.substring(2);
    jsonSignature.s = "0x" + jsonSignature.s;
    const hexSignature = ethers.utils.joinSignature(jsonSignature);

    // Serialize and send
    const signedTx = ethers.utils.serializeTransaction(cancelTx, hexSignature);
    const txResponse = await provider.sendTransaction(signedTx);
    console.log(`Cancel TX broadcast. Hash: ${txResponse.hash}`);

    // Wait for it to confirm (1 block by default)
    const receipt = await provider.waitForTransaction(txResponse.hash, 1, 60000);
    if (!receipt || receipt.status === 0) {
      throw new Error(`Cancel TX was not mined or reverted. Hash: ${txResponse.hash}`);
    }
    console.log(`Cancel TX mined in block ${receipt.blockNumber}`);

    // Now re-check
    const newChainNonceHex = await Lit.Actions.getLatestNonce({
      address: relayerAddress,
      chain: rpcChain,
    });
    const newChainNonceLit = parseInt(newChainNonceHex, 16);
    const newChainNonceEthers = await provider.getTransactionCount(
      relayerAddress,
      "pending"
    );

    console.log(`After reset => Lit: ${newChainNonceLit}, Ethers: ${newChainNonceEthers}`);

    // If it's still mismatched or not incremented, consider it a failure
    if (newChainNonceLit !== newChainNonceEthers) {
      throw new Error(
        `Nonce mismatch remains. Lit => ${newChainNonceLit}, Ethers => ${newChainNonceEthers}`
      );
    }
    // We can also verify it incremented as expected, but that depends on your logic.

    // All good now
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: `Nonce reset or verified successfully.`,
        oldChainNonceLit: chainNonceLit,
        oldChainNonceEthers: chainNonceEthers,
        newChainNonceLit,
        newChainNonceEthers,
        cancelTxHash: txResponse.hash,
      }),
    });
  } catch (error) {
    console.error("Error in checkOrResetNonceAction:", error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message,
      }),
    });
  }
};

checkOrResetNonceAction();


// @ts-nocheck
//signedTx, secureSessionId, sessionIdAndDurationSig, duration

//ipfs-cid:QmcBLoCwo7JBuf1aMfTuRh76EES2gHgtKYNM5Xen3o7uQb
// export const approveSigner = `(

(async () => {

  const verifySessionDurationAndSecureId = () => {
    const encodedData = ethers.utils.concat([
      ethers.utils.toUtf8Bytes(secureSessionId),
      ethers.utils.hexlify(ethers.BigNumber.from(duration))
    ]);

    const message = ethers.utils.keccak256(encodedData);
    const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sessionIdAndDurationSig);

    const tx = ethers.utils.parseTransaction(signedTx);
    if (!tx.from) throw new Error('tx undefined')
    if (recoveredAddress.toLowerCase() !== tx.from.toLowerCase()) {
      throw new Error("Invalid session duration signature");
    }
  };

  // Verify the transaction
  const tx = ethers.utils.parseTransaction(signedTx);
  if (tx.data.slice(0, 10) !== ethers.utils.id("approve(address,uint256)").slice(0, 10)) {
    throw new Error("Invalid transaction: not an approve function");
  }

  // Verify session duration and secure ID signature
  verifySessionDurationAndSecureId();


  // Send the pre-signed transaction using runOnce
  try {
  let txHash = await Lit.Actions.runOnce({
    waitForResponse: true,
    name: "approveTxSender"
  }, async () => {
      const rpcUrl = await Lit.Actions.getRpcUrl({ chain: "sepolia" });
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const tx = await provider.sendTransaction(signedTx);
      await tx.wait(); // Wait for the transaction to be mined
      return tx.hash;
    });
  } catch (error) {
    Lit.Actions.setResponse(error);
  }

})();
// `;


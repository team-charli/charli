// @ts-nocheck
export const approveSigner = `(
  async () => {
    // ETHEREUM NETWORK = sepolia
    // LIT NETWORK = datil-dev
    // /* with authSig*/ ipfs cid = Qmc5wkdAA5aTyPvQpTxHSRX5huyt6na518wU3uk74nxnX9
    // /* NO authSig*/ipfs cid = QmbSdNiVmMKTWgYEAUZEsdRUmBbE5tEU232UP7UsXE9Uvf
    const USDC_CONTRACT_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const args = { sig, learnerAddress, secureSessionId, spenderAddress, amount, /*authSig,*/ learnerPublicKey, pinataApiCypherText, pinataApiKeyEncryptionHash };
    const encodedData = ethers.utils.concat([
      ethers.utils.toUtf8Bytes(secureSessionId),
      ethers.utils.hexZeroPad(ethers.utils.hexlify(learnerAddress), 32)
    ]);
    const message = ethers.utils.keccak256(encodedData);

    const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(message), sig);

    const senderConditions = [
      {
        conditionType: "evmBasic",
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: recoveredAddress
        }
      }
    ];

    const isSenderVerified = await Lit.Actions.checkConditions({ conditions: senderConditions, authSig: null });
    if (!isSenderVerified) {
      Lit.Actions.SetResponse("Sender address verification failed");
    }

    // Prepare the approve transaction
    const erc20AbiFragment = ["function approve(address spender, uint256 amount) returns (bool)"];
    const iface = new ethers.utils.Interface(erc20AbiFragment);
    const data = iface.encodeFunctionData("approve", [spenderAddress, amount]);
    const tx = {
      to: USDC_CONTRACT_ADDRESS,
      data: data,
      gasLimit: ethers.utils.hexlify(110000), // Adjust as needed
    };

    // Sign the transaction
    const serializedTx = ethers.utils.serializeTransaction(tx);
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serializedTx));
    const toSign = await new TextEncoder().encode(hash);
    let signature;
    try {
      signature = await Lit.Actions.signAndCombineEcdsa({
        toSign,
        publicKey: learnerPublicKey,
        sigName: "approveSignature"
      });
    } catch (error) {
      Lit.Actions.SetResponse(error);
    }

    // Use runOnce to send the transaction from a single node
    let txResponse;
    let linkData;
    try {
      txResponse = await Lit.Actions.runOnce({
        waitForResponse: false,
        name: "approveTxSender"
      }, async () => {
          const rpcUrl = await Lit.Actions.getRpcUrl({ chain: "sepolia" });
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          const signedTx = ethers.utils.serializeTransaction(tx, signature);
          const tx = await provider.sendTransaction(signedTx);
          await tx.wait(); // Wait for the transaction to be mined

          return JSON.stringify({
            transactionHash: tx.hash,
            blockHash: tx.blockHash,
            blockNumber: tx.blockNumber
          });
        });
      txResponse = JSON.parse(txResponse);

      // Create IPFS link
      linkData = {
        originalMessage: hash,
        approvedSpender: spenderAddress,
        approvedAmount: amount.toString(),
        learnerAddress: learnerAddress,
        secureSessionId: secureSessionId,
        transactionHash: txResponse.transactionHash,
        blockHash: txResponse.blockHash,
        blockNumber: txResponse.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      Lit.Actions.setResponse("error sending approve transaction" + error);
    }

    let ipfsToken;
    try {
      ipfsToken = await Lit.Actions.decryptAndCombine({
        accessControlConditions: [],
        ciphertext: pinataApiCypherText,
        dataToEncryptHash: pinataApiKeyEncryptionHash,
        authSig: null,
        chain: 'ethereum',
      });
    } catch (error) {
      Lit.Actions.setResponse("error decrypting pinata token" + error);
    }

    let ipfsHash;

    try {
      ipfsHash = await Lit.Actions.runOnce({ waitForResponse: false, name: "IFFS_post_linked_Tx" }, async () => {
        const postContent = JSON.stringify(linkData);
        const pinataMetadata = JSON.stringify({ id: secureSessionId });
        const options = {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + ipfsToken, 'Content-Type': 'application/json' },
          body: '{"pinataOptions":{"cidVersion":1},"pinataMetadata":' + pinataMetadata + ',"pinataContent":' + postContent + '}'
        };

        fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', options)
          .then(response => response.json())
          .then(response => console.log(response))
          .catch(err => console.error(err));
      });
    } catch (error) {
      Lit.Actions.setResponse("error pinning link data" + error);
    }

    // Return transaction hash and IPFS hash
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        transactionHash: txResponse.transactionHash,
        blockHash: txResponse.blockHash,
        blockNumber: txResponse.blockNumber,
        ipfsHash: ipfsHash
      })
    });
  })();
`;

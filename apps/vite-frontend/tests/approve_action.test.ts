import { LocalStorage } from "node-localstorage";
import {ethers, parseUnits, Wallet, hexlify, randomBytes, JsonRpcProvider, HDNodeWallet, Transaction, TransactionRequest, AddressLike, BytesLike, BigNumberish} from 'ethers'
import { expect, test, beforeAll } from "bun:test";
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import { getSessionSigsViaAuthSig } from './setup/sessionSigs';
import { SessionSigs, SessionSigsMap } from "@lit-protocol/types";
import { learnerSessionId_DurationSigs } from "./setup/sessionId_duration_sigs";

let litNodeClient: LitNodeClient;
let signedTx: string;
let secureSessionId: string;
let learner_sessionIdAndDurationSig: string;
let sessionSigs: SessionSigsMap | undefined;
let duration: BigNumberish;
let learnerWallet: HDNodeWallet;
let CONTROLLER_ADDRESS: AddressLike;
let sessionData: BytesLike;
let tx: TransactionRequest;
let signatureVerificationPassed = false;

beforeAll(async () => {
  litNodeClient = new LitNodeClient({
    alertWhenUnauthorized: false,
    litNetwork: LitNetwork.DatilDev,
    checkNodeAttestation: false,
    debug: true,
    storageProvider: {
      provider: new LocalStorage("./lit_storage.db"),
    },
  });

  const USDC_CONTRACT_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  CONTROLLER_ADDRESS = ethers.Wallet.createRandom().address;
  const provider = new ethers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  learnerWallet = ethers.Wallet.createRandom(provider);
  const amount = ethers.parseUnits("5", 6);
  tx = {
    to: USDC_CONTRACT_ADDRESS,
    gasLimit: BigInt(ethers.toBeHex(100000)),
    data: new ethers.Interface(["function approve(address spender, uint256 amount)"]).encodeFunctionData("approve", [CONTROLLER_ADDRESS, amount]),
  };
  signedTx = await learnerWallet.signTransaction(tx);
  secureSessionId = ethers.hexlify(ethers.randomBytes(16));
  duration = BigInt(30); // mins


  await litNodeClient.connect();
  const learnerSignedData = await learnerSessionId_DurationSigs(secureSessionId, duration, learnerWallet )
  learner_sessionIdAndDurationSig = learnerSignedData.learner_sessionIdAndDurationSig;
  sessionData = learnerSignedData.sessionData;
  sessionSigs = await getSessionSigsViaAuthSig(learnerWallet, litNodeClient);
});

test("verify signature recovery", () => {
  try {
    console.log("learnerWallet address: ", learnerWallet.address);
    console.log("CONTROLLER_ADDRESS address:", CONTROLLER_ADDRESS);
    console.log("tx")
    const parsedTx = ethers.Transaction.from(signedTx);
    if (!parsedTx.from) {
      throw new Error("Transaction 'from' address is null");
    }

    // Use the same message creation process for verification
    const message = ethers.keccak256(sessionData);
    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), learner_sessionIdAndDurationSig);

    // Ensure both addresses are strings and lowercase for comparison
    const recoveredAddressLower = recoveredAddress.toLowerCase();
    const txFromLower = parsedTx.from.toLowerCase();

    expect(recoveredAddressLower).toBe(txFromLower);
    console.log("Signature verification passed");
    signatureVerificationPassed = true;
    console.log("signatureVerificationPassed", signatureVerificationPassed)
  } catch (error) {
    console.error("Signature verification failed:", error);
    signatureVerificationPassed = false;
    console.log("signatureVerificationPassed", signatureVerificationPassed)
  }
});

test("call approve", async () => {
  try {
    const actionResult = await litNodeClient.executeJs({
      ipfsId: "QmR1fbsosSmH76GXUCoW6nRgQei6N9Twm9MsEcH12NnMCX",
      sessionSigs,
      jsParams: {
        signedTx,
        secureSessionId,
        sessionIdAndDurationSig: learner_sessionIdAndDurationSig,
        duration
      }
    })
    console.log("actionResult", actionResult)
    expect(true).toBe(true);
  } catch(error) {
    console.error("Error in executeJs:", error);
    expect(true).toBe(false);
  }
});


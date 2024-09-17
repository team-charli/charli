import { LocalStorage } from "node-localstorage";
import {ethers, parseUnits, Wallet, hexlify, randomBytes, JsonRpcProvider, HDNodeWallet, Transaction, TransactionRequest, AddressLike, BytesLike, SignatureLike, toBeHex} from 'ethers'
import { expect, test, beforeAll } from "bun:test";
import { LitNodeClient, encryptString } from '@lit-protocol/lit-node-client';
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import {LPACC_EVM_BASIC } from '@lit-protocol/accs-schemas';
import { getSessionSigsViaAuthSig } from './setup/sessionSigs';
import { AccessControlConditions, ExecuteJsResponse, SessionSigs, SessionSigsMap } from "@lit-protocol/types";
import { generateControllerData } from "./setup/controllerData";
import { learnerSessionId_DurationSigs, teacherSessionId_DurationSigs } from "./setup/sessionId_duration_sigs";
import { sessionSigsForDecryptInAction } from "./setup/sessionSigsForDecryptInAction";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { waitForConfirmation } from "./setup/waitForTx";

let litNodeClient: LitNodeClient;
let learnerSessionSigs: SessionSigsMap | undefined;
let teacherSessionSigs: SessionSigsMap | undefined;

const transferFromAction_ipfsId = "QmeyUYpwgi62rD6ScZyQ8a2UjeeJFPz4gHZEfADDxN27Wx";
const approve_ipfsId = "QmUExi6PorFUZmWzxQB9jV963vuQutcrdPZAVc6dmVj9Tq"
let approveTx: TransactionRequest;
let signedApproveTx: string;
let learner_sessionIdAndDurationSig: string;

let controllerAddress: AddressLike
let controllerPubKey: string;
let usdcContractAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
let chainId = 84532;
let chain = "sepolia";
let sessionDataLearnerSig: SignatureLike;
let sessionDataTeacherSig: SignatureLike;
let sessionDuration = 30;
let hashedLearnerAddress: AddressLike;
let hashedTeacherAddress: AddressLike;
let learnerAddressCiphertext: string;
let learnerAddressEncryptHash: string;
let accessControlConditions: AccessControlConditions;

let userId: string;
let keyId: string;
const amount = ".10";
const amountScaled = ethers.parseUnits(".10", 6)
let allowanceAmountParsed: string;
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia')

const teacherPrivateKey = Bun.env.TEACHER_PRIVATEKEY;
const learnerPrivateKey = Bun.env.LEARNER_PRIVATEKEY;
if (!learnerPrivateKey?.length || !teacherPrivateKey?.length) throw new Error('failed to import pk envs')
const learnerWallet = new ethers.Wallet(learnerPrivateKey, provider)
const teacherWallet = new ethers.Wallet(teacherPrivateKey, provider)
console.log("learnerWallet.address", learnerWallet.address);
console.log("teacherWallet.address", teacherWallet.address);

const secureSessionId = ethers.hexlify(ethers.randomBytes(16))
const duration = BigInt(30); // mins
let approveActionResult: ExecuteJsResponse;

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

  await litNodeClient.connect()

  hashedTeacherAddress = ethers.keccak256(teacherWallet.address);
  const controllerData = generateControllerData(litNodeClient, transferFromAction_ipfsId)
  keyId = controllerData.claim_key_id;
  controllerAddress = controllerData.controller_address;
  controllerPubKey = controllerData.controller_public_key;
  userId = controllerData.controller_claim_user_id;
  const learnerSignedData = await learnerSessionId_DurationSigs(secureSessionId, BigInt(duration), learnerWallet )
  learner_sessionIdAndDurationSig = learnerSignedData.learner_sessionIdAndDurationSig;

  sessionDataLearnerSig = learnerSignedData.learner_sessionIdAndDurationSig;
  const teacherSignedData = await teacherSessionId_DurationSigs(secureSessionId, duration, teacherWallet)
  sessionDataTeacherSig = teacherSignedData.teacher_sessionIdAndDurationSig;

  hashedLearnerAddress = ethers.keccak256(learnerWallet.address);
  // encrypt learnerAddress

  accessControlConditions = [
    {
      contractAddress: '',
      standardContractType: '',
      chain: "ethereum",
      method: '',
      parameters: [
        ':userAddress',
      ],
      returnValueTest: {
        comparator: '=',
        value: teacherWallet.address
      }
    }
  ]
  const {ciphertext, dataToEncryptHash} =  await encryptString({dataToEncrypt: learnerWallet.address, accessControlConditions}, litNodeClient)
  learnerAddressCiphertext = ciphertext;
  learnerAddressEncryptHash = dataToEncryptHash;

  // sessionSigs

  learnerSessionSigs = await sessionSigsForDecryptInAction(learnerWallet, litNodeClient, accessControlConditions, learnerAddressEncryptHash);

  teacherSessionSigs = await sessionSigsForDecryptInAction(teacherWallet, litNodeClient, accessControlConditions, learnerAddressEncryptHash);
  let nonce: number;

  const currentNonce = await provider.getTransactionCount(learnerWallet.address, "latest");
  const pendingNonce = await provider.getTransactionCount(learnerWallet.address, "pending");

  if (pendingNonce > currentNonce) {
    // Only send a corrective transaction if there's a discrepancy
    const cancelTx = {
      to: learnerWallet.address,
      value: 0,
      gasLimit: 21000,
      gasPrice: ethers.parseUnits("10", "gwei"),
      nonce: currentNonce,
    };
    const cancelTxResponse = await learnerWallet.sendTransaction(cancelTx);
    await cancelTxResponse.wait();
    console.log("Nonce corrected with transaction:", cancelTxResponse.hash);

    // After correction, the nonce should be the next one
    nonce = currentNonce + 1;
  } else {
    console.log("No nonce correction needed");
    // If no correction was needed, use the pending nonce
    nonce = pendingNonce;
  }
  // approve test setup
  const feeData = await provider.getFeeData();
  console.log("Gas Fee Data:");
  console.log("  maxFeePerGas:", feeData.maxFeePerGas ? feeData.maxFeePerGas.toString() : "undefined");
  console.log("  maxPriorityFeePerGas:", feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas.toString() : "undefined");
  if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) throw new Error("feeData undefined")
  approveTx = {
    to: usdcContractAddress,
    gasLimit: 65000,
    chainId: 11155111,
    maxPriorityFeePerGas: toBeHex((feeData?.maxPriorityFeePerGas * BigInt(120)) / BigInt(100)),
    maxFeePerGas: toBeHex((feeData?.maxFeePerGas * BigInt(120)) / BigInt(100)),
    nonce,
    data: new ethers.Interface(["function approve(address spender, uint256 amount)"]).encodeFunctionData("approve", [controllerAddress, amountScaled]),
  };

  signedApproveTx = await learnerWallet.signTransaction(approveTx);

  //mintClaimBurn
  const localFunctionUrl = 'http://127.0.0.1:54321/functions/v1/mint-controller-pkp';

  try {
    const response = await fetch(localFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other required headers here
      },
      body: JSON.stringify({ keyId: keyId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const mintPkpResult = await response.json();

    // Process the result here
    console.log("mintPkpResult", mintPkpResult);
    await waitForConfirmation(mintPkpResult.mintTx.hash);
    await waitForConfirmation(mintPkpResult.burnTx.hash);
  } catch (error) {
    console.log("error in beforeAll", error)
  }
})

test.skip("approve and transferFromLearnerToControllerAction", async () => {
  try {
    const jsParams = {
      signedTx: signedApproveTx,
      secureSessionId,
      sessionIdAndDurationSig: learner_sessionIdAndDurationSig,
      duration: String(sessionDuration)
    }

    console.log("jsParams", jsParams)
    approveActionResult = await litNodeClient.executeJs({
      ipfsId: approve_ipfsId,
      sessionSigs: learnerSessionSigs,
      jsParams
    })
    console.log("actionResult", approveActionResult)
    expect(true).toBe(true);
  } catch(error) {
    console.error("Error in executeJs:", error);
    expect(true).toBe(false);
  }

  const txHash = JSON.parse(approveActionResult.response as string);

  if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
    throw new Error('Invalid transaction hash');
  }

  const tx = await provider.getTransaction(txHash);
  await tx!.wait(1);

  // Now proceed with your transferFrom test
  console.log("usdcContractAddress", usdcContractAddress);
  console.log("controllerAddress", controllerAddress);
  console.log("learnerAddress", learnerWallet.address);
  try {
    const actionResult = await litNodeClient.executeJs({
      ipfsId: transferFromAction_ipfsId,
      sessionSigs: teacherSessionSigs,
      jsParams: {
        keyId,
        ipfsId: transferFromAction_ipfsId,
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
    })
    console.log("actionResult", actionResult)
    expect(true).toBe(true);

  } catch (error) {
    console.error("Error in executeJs:", error);
    expect(true).toBe(false);
  }
}, 60000);


import { LocalStorage } from "node-localstorage";
import {ethers, TransactionRequest, AddressLike, SignatureLike, toBeHex, TransactionResponse} from 'ethers'
import { expect, test, beforeAll, afterAll } from "bun:test";
import { LitNodeClient, encryptString } from '@lit-protocol/lit-node-client';
import {PINATA_API_DATA_CIPHERTEXT, PINATA_API_DATA_ENCRYPTHASH } from './setup/pinataEncryptedData'
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import { AccessControlConditions, ExecuteJsResponse, SessionSigs, SessionSigsMap } from "@lit-protocol/types";
import { learnerSessionId_DurationSigs, teacherSessionId_DurationSigs } from "./setup/sessionId_duration_sigs";
import { sessionSigsForDecryptInAction } from "./setup/sessionSigsForDecryptInAction";
import { condenseSignatures } from "./setup/condenseClaimKeySigs";
import { restoreSignatures } from "./setup/restoreClaimKeySigs";

const transferFromAction_ipfsId = "QmR1sEv9UHAvXmALKZRpv9zy7gxD6BpGQ8ur4QWDSBQLG3";
const approve_ipfsId = "QmSd4PUjGmK9iNcMvBPS118QEWHg8JKgVTaqkqi7DS1dhv"
const relayerIpfsId = "Qmdg7WDHFddPzB95iKZW69riRCNyXcoWscF3xLva7d6BvT"

let inputPublicKey: string;
let outputPublicKey: string;
let inputAddress: string;
let outputAddress: string;
let isPermittedAction: boolean;
let getControllerKeyClaimDataResponse: any;
let litNodeClient: LitNodeClient;
let learnerSessionSigs: SessionSigsMap | undefined;
let teacherSessionSigs: SessionSigsMap | undefined;

let learner_sessionIdAndDurationSig: string;
let approveTxResponse: TransactionResponse | null;
const claimKeyIpfsId = "QmcAqoHwpC1gS59GQKgVXGhfhCqBYvF1PpzvZypv6XW6Xk"

const env: "dev" | "test" | "production" = "dev"

let controllerAddress: AddressLike
let controllerPubKey: string;
let controllerClaimKeySigs: SignatureLike[];
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
const amount = ".05";
const amountScaled = ethers.parseUnits(".05", 6)
let allowanceAmountParsed: string;
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const yellowStoneProvider = new ethers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
const rpcChain = Bun.env.CHAIN_NAME_FOR_ACTION_PARAMS_BASE_SEPOLIA;
const rpcChainId = Bun.env.CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA;
const daiContractAddress = Bun.env.USDC_CONTRACT_ADDRESS_BASE_SEPOLIA;
const ethereumRelayerPublicKey = Bun.env.CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY;

const teacherPrivateKey = Bun.env.TEACHER_PRIVATEKEY;
const learnerPrivateKey = Bun.env.LEARNER_PRIVATEKEY;
const controllerPrivateKey = Bun.env.CONTROLLER_PRIVATEKEY;
if (!learnerPrivateKey?.length || !teacherPrivateKey?.length || !controllerPrivateKey?.length) throw new Error('failed to import pk envs')
const learnerWallet = new ethers.Wallet(learnerPrivateKey, provider)
const teacherWallet = new ethers.Wallet(teacherPrivateKey, provider)
const controllerWallet = new ethers.Wallet(controllerPrivateKey, yellowStoneProvider)
console.log("learnerWallet.address", learnerWallet.address);
console.log("teacherWallet.address", teacherWallet.address);
console.log("daiContractAddress", daiContractAddress);

const secureSessionId = ethers.hexlify(ethers.randomBytes(16))
const duration = BigInt(30); // mins
let approveActionResult: ExecuteJsResponse;
let approveMessageHash: string;
let approvalMessageSig: string;

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

  // const litContracts = new LitContracts({ signer: learnerWallet, network: LitNetwork.DatilDev});
  await litNodeClient.connect();
  // await litContracts.connect();

  const learnerSignedData = await learnerSessionId_DurationSigs(secureSessionId, BigInt(duration), learnerWallet )
  learner_sessionIdAndDurationSig = learnerSignedData.learner_sessionIdAndDurationSig;

  sessionDataLearnerSig = learnerSignedData.learner_sessionIdAndDurationSig;
  const teacherSignedData = await teacherSessionId_DurationSigs(secureSessionId, duration, teacherWallet)
  sessionDataTeacherSig = teacherSignedData.teacher_sessionIdAndDurationSig;
  hashedTeacherAddress = ethers.keccak256(teacherWallet.address);
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
  // controllerData for mint
  const uniqueData = `ControllerPKP_${Date.now()}`;
  const bytes = ethers.toUtf8Bytes(uniqueData);
  userId = ethers.keccak256(bytes);
  const keyId = litNodeClient.computeHDKeyId(userId, claimKeyIpfsId, true);

  const GET_CONTROLLER_KEY_CLAIM_DATA_URL = 'http://127.0.0.1:54321/functions/v1/get-controller-key-claim-data';

  getControllerKeyClaimDataResponse = await fetch(GET_CONTROLLER_KEY_CLAIM_DATA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: keyId,
    }),
  });

  getControllerKeyClaimDataResponse = await getControllerKeyClaimDataResponse.json();

  //returned: [publicKey, claimAndMintResult];
  console.log("getControllerKeyClaimDataResponse ", getControllerKeyClaimDataResponse  )
  controllerPubKey = getControllerKeyClaimDataResponse[0];
  inputPublicKey = controllerPubKey;
  console.log("controllerPubKey", controllerPubKey)
  controllerAddress = ethers.computeAddress(controllerPubKey);
  inputAddress = controllerAddress;
  const derivedKeyId = getControllerKeyClaimDataResponse[1][keyId].derivedKeyId;
  const rawControllerClaimKeySigs = getControllerKeyClaimDataResponse[1][keyId].signatures;


  const condensedSigs = condenseSignatures(rawControllerClaimKeySigs);
  /*--Store Base64 Sigs in DB--*/
  // -- db put --
  /* Restore Signatures -- */
  controllerClaimKeySigs = restoreSignatures(condensedSigs);

  //mintClaimBurn
  const MINT_CLAIM_BURN_URL = 'http://127.0.0.1:54321/functions/v1/mint-controller-pkp'

  let mintClaimBurnResponse: any = await fetch(MINT_CLAIM_BURN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyType: 2,
      derivedKeyId: derivedKeyId,
      signatures: controllerClaimKeySigs,
      env: "dev",
      ipfsIdsToRegister: [approve_ipfsId, transferFromAction_ipfsId ]
    }),
  });
  mintClaimBurnResponse = await mintClaimBurnResponse.json();
  console.log("mintClaimResponse", mintClaimBurnResponse)
  outputPublicKey = mintClaimBurnResponse.pkpInfo.publicKey;
  outputAddress = ethers.computeAddress(outputPublicKey);

  isPermittedAction = mintClaimBurnResponse.permissions.isPermittedAction;
  // approve test setup
  const feeData = await provider.getFeeData();
  if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) throw new Error("feeData undefined")

  const signApprovalMessage = async () => {
    const approveMessageHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "string"],
      [daiContractAddress, controllerAddress, amountScaled, secureSessionId]
    );

    const approvalMessageSig = await learnerWallet.signMessage(ethers.getBytes(approveMessageHash));
    return { approveMessageHash, approvalMessageSig };
  };

  // Usage
  const signedApproveMessage = await signApprovalMessage();
  approveMessageHash = signedApproveMessage.approveMessageHash;
  approvalMessageSig = signedApproveMessage.approvalMessageSig;
})

test("approve", async () => {
  try {
    const jsParams = {
      daiContractAddress,
      controllerAddress,
      amountScaled,
      secureSessionId,
      learnerAddress: learnerWallet.address,
      duration,
      sessionIdAndDurationSig: sessionDataLearnerSig,
      env,
      relayerIpfsId,
      rpcChain,
      rpcChainId,
      ethereumRelayerPublicKey,
      approveMessageHash,
      approvalMessageSig
    }

    console.log("jsParams", jsParams)
    if (!learnerSessionSigs) throw new Error('sessionSigs undefined')

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

  approveTxResponse = await provider.getTransaction(txHash);
  await approveTxResponse!.wait(1);
}, 30000);

test.skip("transferFromLearnerToControllerAction", async () => {
  await litNodeClient.disconnect();
  (litNodeClient?.config?.storageProvider?.provider as LocalStorage).clear();
  await litNodeClient.connect();
  teacherSessionSigs = await sessionSigsForDecryptInAction(teacherWallet, litNodeClient, accessControlConditions, learnerAddressEncryptHash);
  const jsParams = {
    ipfsId: transferFromAction_ipfsId,
    userId,
    controllerAddress,
    controllerPubKey: controllerPubKey.startsWith("0x") ? controllerPubKey.slice(2) : controllerPubKey,
    daiContractAddress,
    chain,
    chainId,
    sessionDataLearnerSig,
    sessionDataTeacherSig,
    sessionDuration,
    secureSessionId,
    hashedLearnerAddress,
    hashedTeacherAddress,
    amount,
    accessControlConditions,
    relayerIpfsId,
    env
  }

  console.log("jsParams", jsParams)
  let actionResult: any;
  try {

    actionResult = await litNodeClient.executeJs({
      ipfsId: transferFromAction_ipfsId,
      sessionSigs: teacherSessionSigs,
      jsParams
    })
    console.log("actionResult", actionResult)
    expect(true).toBe(true);

  } catch (error) {
    console.error("Error in executeJs:", error);
    expect(true).toBe(false);
  } finally {
    console.log("actionResult", actionResult)
  }
}, 50000);
afterAll(async () => {
  console.log("inputPublicKey", inputPublicKey )
  console.log("outputPublicKey", outputPublicKey)
  console.log("inputAddress", inputAddress);
  console.log("outputAddress", outputAddress);
  console.log("isPermittedAction", isPermittedAction)
})


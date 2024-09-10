import { LocalStorage } from "node-localstorage";
import {ethers, parseUnits, Wallet, hexlify, randomBytes, JsonRpcProvider, HDNodeWallet, Transaction, TransactionRequest, AddressLike, BytesLike, SignatureLike} from 'ethers'
import { expect, test, beforeAll } from "bun:test";
import { LitNodeClient, encryptString } from '@lit-protocol/lit-node-client';
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import {LPACC_EVM_BASIC } from '@lit-protocol/accs-schemas';
import { getSessionSigsViaAuthSig } from './setup/sessionSigs';
import { AccessControlConditions, SessionSigs, SessionSigsMap } from "@lit-protocol/types";
import { generateControllerData } from "./setup/controllerData";
import { learnerSessionId_DurationSigs, teacherSessionId_DurationSigs } from "./setup/sessionId_duration_sigs";

let litNodeClient: LitNodeClient;
let sessionSigs: SessionSigsMap | undefined;
let teacherWallet: HDNodeWallet;
const ipfsId = "QmSaCpwsRZts2SJ2aGcsQ2wudRaDBnL5MH1AVH96gZfjFJ";


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
const amount = "5";
const provider = new ethers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
const learnerWallet = ethers.Wallet.createRandom(provider);
let encryptedLearnerAddress: string;
const secureSessionId = ethers.hexlify(ethers.randomBytes(16))
const duration = BigInt(30); // mins

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

  teacherWallet = ethers.Wallet.createRandom();
  hashedTeacherAddress = ethers.keccak256(teacherWallet.address);
  const controllerData = generateControllerData(litNodeClient, ipfsId)
  keyId = controllerData.claim_key_id;
  controllerAddress = controllerData.controller_address;
  controllerPubKey = controllerData.controller_public_key;
  userId = controllerData.controller_claim_user_id;
  const learnerSignedData = await learnerSessionId_DurationSigs(secureSessionId, duration, learnerWallet  )
  sessionDataLearnerSig = learnerSignedData.learner_sessionIdAndDurationSig;
  const teacherSignedData = await teacherSessionId_DurationSigs(secureSessionId, duration, teacherWallet)
  sessionDataTeacherSig = teacherSignedData.teacher_sessionIdAndDurationSig;

  hashedLearnerAddress = ethers.keccak256(learnerWallet.address);
  // encrypt learnerAddress
  accessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "SIWE",
      chain: "ethereum",
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: teacherWallet.address,
      },
    },
  ];
  const {ciphertext, dataToEncryptHash} =  await encryptString({dataToEncrypt: learnerWallet.address, accessControlConditions}, litNodeClient)
  learnerAddressCiphertext = ciphertext;
  learnerAddressEncryptHash = dataToEncryptHash;

// sessionSigs
sessionSigs = await getSessionSigsViaAuthSig(teacherWallet, litNodeClient, accessControlConditions, learnerAddressEncryptHash );
})


test.skip("has all jsParams properties defined", () => {
  const jsParams = {
    keyId,
    ipfsId,
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
  };

  const undefinedProps: string[] = [];

  for (const [key, value] of Object.entries(jsParams)) {
    try {
      expect(value).toBeDefined();
    } catch (error) {
      undefinedProps.push(key);
    }
  }

  if (undefinedProps.length > 0) {
    throw new Error(`The following properties are undefined: ${undefinedProps.join(', ')}`);
  }
});

test("transferFromLearnerToControllerAction", async () => {
  try {
    const actionResult = await litNodeClient.executeJs({
      ipfsId,
      sessionSigs,
      jsParams: {
        keyId,
        ipfsId,
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
})

test.skip("test basic action response", async () => {
  await litNodeClient.executeJs({
    ipfsId: "QmU3GNi4bUeMfLxULkrkG8kyFpb1yzxu81oqnydUF6wLWe",
    sessionSigs,
    jsParams: {
      param: "zero"
    }
  })
})

test.skip("log params in Lit Action", async () => {
  const jsParams =  {
    keyId,
    ipfsId,
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
  console.log("jsParams", jsParams)
  await litNodeClient.executeJs({
  ipfsId: "QmUDrRKS3CustSrbanNuSCmZ8ugqSfYeXPFMk25zVRV1f1",
  sessionSigs,
  jsParams
  })
})

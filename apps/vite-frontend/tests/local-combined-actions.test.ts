import { LocalStorage } from "node-localstorage";
import {ethers, AddressLike, SignatureLike, TransactionResponse} from 'ethers'
import { expect, test, beforeAll, beforeEach, afterAll } from "bun:test";
import { LitNodeClient, encryptString, } from '@lit-protocol/lit-node-client';
import { LitNetwork } from "@lit-protocol/constants";
import { AccessControlConditions, SessionSigsMap } from "@lit-protocol/types";
import { learnerSessionId_DurationSigs, teacherSessionId_DurationSigs } from "./setup/sessionId_duration_sigs";
import { sessionSigsForDecryptInAction } from "./setup/sessionSigsForDecryptInAction";
import chalk from 'chalk'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaGxobW9uZHZ4d3dpd25ydXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc0ODg1ODUsImV4cCI6MjAxMzA2NDU4NX0.QjriFvDkfGR8-w_WdTIgMDgcH5EXvs5gyRBOEV880ic";

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

let permitActionResult: any;

let inputPublicKey: string;
let outputPublicKey: string;
let inputAddress: string;
let outputAddress: string;
interface CidPermissionOutput { [cidName: string]: boolean; }
let relayerPkpApprovedActions: CidPermissionOutput;

const relayerTokenId =  Bun.env.CHARLI_ETHEREUM_RELAYER_PKP_TOKEN_ID!;

// with retry const relayerActionIpfsId="QmUViTAVBCbH4rTKHLYKm2Fjd4s7pTM3qbxASmPhcuWQec";
let getControllerKeyClaimDataResponse: any;
let litNodeClient: LitNodeClient;
let learnerSessionSigs: SessionSigsMap | undefined;
let teacherSessionSigs: SessionSigsMap | undefined;
// const relayerActionIpfsId="QmTyFgxGEY1iEoAh9B7H74diQFc3acM5mLiZedY7WUL7HX";

///// relayerPkpTokenId="79954854284656953966413268915949291963372041247183575496884270979393743813646";
const permitActionIpfsId="Qmdpu1cdQTHT5bsMo9dufrGFesJRjpA6ic2BgQw4RLw2hW";
const transferFromActionIpfsId="QmNkMrztHE96zVhsGwQegBUX3xhHj1ML1qhQ2aCWbFqraR";
const relayerActionIpfsId="QmUNGuq8Azj6sswwhwd2LqLo5MG1GtYue6GcvMjEuMUKYf";
const resetPkpNonceIpfsId="QmRsxUny7KEu1EEr4ftLJy4K6mz82GxbnUaUFzLYRkRUk7"

const relayerAddress = Bun.env.CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS!;

let learner_sessionIdAndDurationSig: string;
let permitTxResponse: TransactionResponse | null;
const claimKeyIpfsId = "QmcAqoHwpC1gS59GQKgVXGhfhCqBYvF1PpzvZypv6XW6Xk"

const env: "dev" | "test" | "production" = "dev"

let controllerAddress: AddressLike
let controllerPubKey: string;
let sessionDataLearnerSig: SignatureLike;
let sessionDataTeacherSig: SignatureLike;
let sessionDuration = 30;
let hashedLearnerAddress: AddressLike;
let hashedTeacherAddress: AddressLike;
let learnerAddressCiphertext: string;
let learnerAddressEncryptHash: string;
let accessControlConditions: AccessControlConditions;

let userId: string;
const amount = ".001";
const amountScaled = ethers.parseUnits(".001", 18)
const providerUrl = Bun.env.PROVIDER_URL_BASE_SEPOLIA;
const provider = new ethers.JsonRpcProvider(providerUrl);
const rpcChain = Bun.env.CHAIN_NAME_FOR_ACTION_PARAMS_BASE_SEPOLIA;
const rpcChainId = Bun.env.CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA;
const daiContractAddress = Bun.env.DAI_CONTRACT_ADDRESS_BASE_SEPOLIA!;
console.log("DAI_CONTRACT_ADDRESS_BASE_SEPOLIA", daiContractAddress )
const ethereumRelayerPublicKey = Bun.env.CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY;

const teacherPrivateKey = Bun.env.TEACHER_PRIVATEKEY;
const learnerPrivateKey = Bun.env.LEARNER_PRIVATEKEY;
// Define required environment variables
const requiredEnvVars = {
  daiContractAddress: daiContractAddress,
  ethereumRelayerPublicKey: ethereumRelayerPublicKey,
  teacherPrivateKey: teacherPrivateKey,
  learnerPrivateKey: learnerPrivateKey,
  providerUrl: providerUrl,
  rpcChainId: rpcChainId,
};

// Check for missing variables
const missingVars = Object.entries(requiredEnvVars)
.filter(([key, value]) => !value)
.map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Failed to import bun env. Missing variables: ${missingVars.join(', ')}`);
}
const learnerWallet = new ethers.Wallet(learnerPrivateKey!, provider)
const teacherWallet = new ethers.Wallet(teacherPrivateKey!, provider)

const secureSessionId = ethers.hexlify(ethers.randomBytes(16))
type LearnerSignedDataType = {
  sessionData: string;
  learner_sessionIdAndDurationSig: string;
}

let learnerSignedData: LearnerSignedDataType ;
let v: number,r: string,s: string;
let deadline:string;
let value: string;
let daiContractNonce: string;
let owner: AddressLike;
let spender: AddressLike;
let nonce: string;



beforeAll(async () => {
  try {
    litNodeClient = new LitNodeClient({
      alertWhenUnauthorized: false,
      litNetwork: LitNetwork.DatilDev,
      checkNodeAttestation: false,
      debug: false,
      storageProvider: {
        provider: new LocalStorage("./lit_storage.db"),
      },
    });

    await litNodeClient.connect()

    // Generate Secure Session Data
    learnerSignedData = await learnerSessionId_DurationSigs(secureSessionId, BigInt(sessionDuration), learnerWallet )
    learner_sessionIdAndDurationSig = learnerSignedData.learner_sessionIdAndDurationSig;

    sessionDataLearnerSig = learnerSignedData.learner_sessionIdAndDurationSig;
    const teacherSignedData = await teacherSessionId_DurationSigs(secureSessionId, BigInt(sessionDuration), teacherWallet)
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
    const {ciphertext, dataToEncryptHash} = await encryptString({dataToEncrypt: learnerWallet.address, accessControlConditions}, litNodeClient)
    learnerAddressCiphertext = ciphertext;
    learnerAddressEncryptHash = dataToEncryptHash;

    // sessionSigs
    learnerSessionSigs = await sessionSigsForDecryptInAction(learnerWallet, litNodeClient, accessControlConditions, learnerAddressEncryptHash);

    // controllerData for mint
    const uniqueData = `ControllerPKP_${Date.now()}`;
    const bytes = ethers.toUtf8Bytes(uniqueData);
    userId = ethers.keccak256(bytes);
    const keyId = litNodeClient.computeHDKeyId(userId, claimKeyIpfsId, true);

    try {
      // Invoke your Edge Function that returns { publicKey, sessionId }
      const { data, error } = await supabaseClient.functions.invoke('get-controller-key-claim-data', {
        body: JSON.stringify({ keyId }),
      });

      if (error) {
        console.log("Error from get-controller-key-claim-data:", error);
        throw error;
      }
      if (!data || !data.publicKey) {
        throw new Error("No data or missing publicKey in get-controller-key-claim-data response");
      }

      // data is now { publicKey, sessionId }
      getControllerKeyClaimDataResponse = data;
    } catch (err) {
      console.log("Error calling get-controller-key-claim-data:", err);
      throw err;
    }
    // now safely pull out publicKey and sessionId
    const { publicKey: returnedPubKey, sessionId } = getControllerKeyClaimDataResponse;
    console.log("Fetched publicKey:", returnedPubKey, "sessionId:", sessionId);

    // returned: data.[publicKey, claimAndMintResult];
    if (Object.keys(getControllerKeyClaimDataResponse).length >1 ) {
      console.log('getControllerKeyClaimDataResponse: true')
    }

    controllerPubKey = returnedPubKey;
    console.log("controllerPubKey", controllerPubKey);
    inputPublicKey = controllerPubKey;
    console.log("controllerPubKey", controllerPubKey)
    controllerAddress = ethers.computeAddress(controllerPubKey);
    inputAddress = controllerAddress;


    //mintClaimBurn
    let mintClaimResponse: any;
    // Next, call your mint-controller-pkp function (which returns { pkpInfo: {publicKey, tokenId, ethAddress}, ... })
    try {
      const { data, error } = await supabaseClient.functions.invoke('mint-controller-pkp', {
        body: JSON.stringify({
          sessionId,
          env: "dev",
          // If you need to register IPFS action IDs:
          ipfsIdsToRegister: [transferFromActionIpfsId],
        }),
      });

      if (error) {
        console.log("Error from mint-controller-pkp:", error);
        throw error;
      }
      if (!data || !data.pkpInfo?.publicKey) {
        throw new Error("No data or missing pkpInfo in mint-controller-pkp response");
      }

      mintClaimResponse = data;
    } catch (err) {
      console.log("Error calling mint-controller-pkp:", err);
      throw err;
    }

    if (Object.keys(mintClaimResponse).length > 1) {
      console.log("success mintClaimResponse")
    }
    // Now you can safely access pkpInfo
    const { pkpInfo } = mintClaimResponse;
    // pkpInfo => { publicKey, tokenId, ethAddress }
    outputPublicKey = pkpInfo.publicKey;
    outputAddress = ethers.computeAddress(outputPublicKey);

    // ERC 20 Permit
    const daiContractAbi = [
      'function name() view returns (string)',
      // 'function version() view returns (string)',
      'function nonces(address owner) view returns (uint256)',
      'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];
    console.log("daiContractAddress", typeof daiContractAddress)
    console.log("daiContractAddress", daiContractAddress)

    const daiContract = new ethers.Contract(daiContractAddress, daiContractAbi, provider);

    const currentAllowance = await daiContract.allowance(learnerWallet.address, controllerAddress);
    if (currentAllowance >= amountScaled) {
      console.log("Approval already set, skipping permit transaction");
      return;
    }

    // permit test setup
    // Set Permit Parameters
    owner = learnerWallet.address;
    spender = relayerAddress;
    value = amountScaled.toString();
    deadline = (Math.floor(Date.now() / 1000) + 3600).toString(); // Convert to string
    const nonceBN = await daiContract.nonces(owner);
    nonce = nonceBN.toString();

    // Types as per EIP-712
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ],
    };

    const message = {
      owner,
      spender,
      value,
      nonce,
      deadline
    };

    // **Domain Data for EIP-712**

    const domain = {
      name: await daiContract.name(),
      version: '1',
      chainId: rpcChainId,
      verifyingContract: daiContractAddress,
    };

    // **Request Signature from the User**
    const signature = await learnerWallet.signTypedData(domain, types, message);

    // **Extract v, r, s from the Signature**
    const splitSig = ethers.Signature.from(signature);
    v = splitSig.v;
    r = splitSig.r;
    s = splitSig.s
  } catch (error) {
    console.log(error);
  }
  const checkResetRelayerNonceResult = await litNodeClient.executeJs({jsParams: {env: 'dev', rpcChain: 'baseSepolia', rpcChainId: '84532', forceReset: false}, sessionSigs: learnerSessionSigs!, ipfsId: resetPkpNonceIpfsId})
  console.log(chalk.blue("checkResetRelayerNonceResult"), checkResetRelayerNonceResult);
})



test("permit", async () => {
  try {
    const jsParams = {
      owner,
      spender,
      nonce: parseInt(daiContractNonce),
      deadline,
      value,
      v,
      r,
      s,
      daiContractAddress,
      relayerIpfsId: relayerActionIpfsId,
      rpcChain: 'baseSepolia',
      rpcChainId,
      secureSessionId: secureSessionId,
      sessionIdAndDurationSig: learnerSignedData.learner_sessionIdAndDurationSig,
      learnerAddress: learnerWallet.address,
      duration: sessionDuration,
      env: 'dev',
    };

    console.log("jsParams Permit Action", jsParams);

    permitActionResult = await litNodeClient.executeJs({
      ipfsId: permitActionIpfsId,
      sessionSigs: learnerSessionSigs!,
      jsParams
    });

    console.log("permitActionResult :", permitActionResult );

    // 2) Parse the transaction hash.
    //    The `permitActionResult.response` is often a JSON-stringified string like: "\"0xe992f35f...\""
    let raw = permitActionResult.response || "";
    // remove outer quotes by JSON-parsing
    const txHash = JSON.parse(JSON.parse(raw));

    // 3) Wait for the transaction to mine locally, at least 1 confirmation
    //    Make sure you have a provider for Base Sepolia. For example:
    const provider = new ethers.JsonRpcProvider(Bun.env.PROVIDER_URL_BASE_SEPOLIA);
    console.log(`Waiting for TX: ${txHash} to confirm...`);
    const receipt = await provider.waitForTransaction(txHash, 1, 60000);
    if (!receipt || receipt.status === 0) {
      throw new Error(`Permit transaction was not mined or reverted: ${txHash}`);
    }
    console.log("Permit transaction mined at block:", receipt.blockNumber);

    // 4) Now the permit is definitely recognized on-chain, the next available
    //    nonce is incremented. Move on to your next test or action.
    expect(true).toBe(true);

  } catch(error) {
    console.error("Error in permit test:", error);
    expect(true).toBe(false);
  }
}, 60000); // a higher timeout to allow for mining


test("transferFromLearnerToControllerAction", async () => {
  await litNodeClient.disconnect();
  (litNodeClient?.config?.storageProvider?.provider as LocalStorage).clear();
  await litNodeClient.connect();
  teacherSessionSigs = await sessionSigsForDecryptInAction(teacherWallet, litNodeClient, accessControlConditions, learnerAddressEncryptHash);
  const jsParams = {
    ipfsId: transferFromActionIpfsId,
    userId,
    learnerAddressCiphertext,
    learnerAddressEncryptHash,
    controllerAddress,
    controllerPubKey: controllerPubKey.startsWith("0x") ? controllerPubKey.slice(2) : controllerPubKey,
    daiContractAddress,
    sessionDataLearnerSig,
    sessionDataTeacherSig,
    sessionDuration,
    secureSessionId,
    hashedLearnerAddress,
    hashedTeacherAddress,
    amount,
    accessControlConditions,
    rpcChain: 'baseSepolia',
    rpcChainId,
    ethereumRelayerPublicKey,
    relayerIpfsId: relayerActionIpfsId,
    env,
    sessionId: 1
  }
  console.log("jsParams transferFrom Action", jsParams)
  try {

    const transferFromActionResult = await litNodeClient.executeJs({
      ipfsId: transferFromActionIpfsId,
      sessionSigs: teacherSessionSigs,
      jsParams
    })
    console.log("transferFromActionResult ", transferFromActionResult )
    expect(true).toBe(true);

  } catch (error) {
    console.error("Error in executeJs:", error);
    expect(true).toBe(false);
  }
}, 30000);


afterAll(async () => {
  console.log("inputPublicKey", inputPublicKey )
  console.log("outputPublicKey", outputPublicKey)
  console.log("inputAddress", inputAddress);
  console.log("outputAddress", outputAddress);
  console.log("relayerPkpApprovedActions: ", relayerPkpApprovedActions )
  console.log(`relayerPKPBalance for ${relayerAddress}`, await provider.getBalance(relayerAddress))
})



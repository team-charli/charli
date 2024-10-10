import { LocalStorage } from "node-localstorage";
import { ethers } from "ethers"
import { getSessionSigsViaAuthSig } from "./setup/sessionSigs"
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork } from "@lit-protocol/constants";
import { getCorrectNonce } from "./setup/getCorrectNonce";

const ipfsId = "QmXCCKD1JoDCTG6b5zTYyhbjzZcUBW1jEHM47iDZ8LftDW";

const sendTo = "0x4c18cE62191c47Ee3d9697Db5f9aEccDE3C0EBAc"
const learnerPrivateKey = process.env.LEARNER_PRIVATEKEY!;
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia')
const learnerWallet = new ethers.Wallet(learnerPrivateKey, provider)
const pkpPublicKey = "048b1d44573ba12c822f2b6f49ad8667e9ffeff32545af168803276c32d4437e508feae6c8ee082a0a1558d9bc35b2833753d278d91331d27cc40b4d9a3f9a64a0"

console.log("learnerWallet address: this address is only used to trigger the serverless function.", learnerWallet.address);
console.log("sendTo address: this should be the destination of the funds sent from the serverless function: ", sendTo)
console.log("this is address of the wallet used by the serverless function:  0x7A0AC1BB54CA4132Ecb59c523D57Dd32ad04B6aF")
const litNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork: LitNetwork.DatilDev,
  checkNodeAttestation: false,
  debug: true,
  storageProvider: {
    provider: new LocalStorage("./lit_storage0.db"),
  },
});

await litNodeClient.connect()

const sessionSigs = await getSessionSigsViaAuthSig(learnerWallet, litNodeClient,)
const feeData = await provider.getFeeData();
const value = ethers.toBeHex(ethers.parseEther(".0001"));

const res = await litNodeClient.executeJs({ipfsId, sessionSigs,
  jsParams: {
    to: sendTo,
    value,
    maxFeePerGas: ethers.toBeHex(feeData.maxFeePerGas ?? 0n),
    maxPriorityFeePerGas: ethers.toBeHex(feeData.maxPriorityFeePerGas ?? 0n),
    nonce: 40, //await getCorrectNonce(learnerWallet.address, provider),
    publicKey: pkpPublicKey,

  },
  responseStrategy: {
    strategy: "leastCommon"
  }
})

console.log("res", res)

import { LocalStorage } from "node-localstorage";
import { ethers } from "ethers"
import { getSessionSigsViaAuthSig } from "./setup/sessionSigs"
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork } from "@lit-protocol/constants";
import { getCorrectNonce } from "./setup/getCorrectNonce";

const ipfsId = "QmeeUm5fJNhnWmuJVFgAWQfwpUNEVQxyZux2CzeZb1VGgU";

const sendTo = "0x4c18cE62191c47Ee3d9697Db5f9aEccDE3C0EBAc";
const pkpPublicKey = "049365fed770d2ee3fad056e560d5e09cc1bd8e2ca74cff9b83916d5e3ba1b33ec746d1a106abe13ed4dd2c98dde60dd57fe2c966ec45240ffc65ee3aaa72a60a6";
const learnerPrivateKey = "081937a8ce4b6708a42819e71f1a4f01f2dacea73244f32a4f709201a70038a9"
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia')

const learnerWallet = new ethers.Wallet(learnerPrivateKey, provider)

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

const res = await litNodeClient.executeJs({
  ipfsId,
  sessionSigs,
  jsParams: {
    to: sendTo,
    value: ethers.toBeHex(ethers.parseEther(".0001")),
    publicKey: pkpPublicKey,
  },
  responseStrategy: {
    strategy: "leastCommon"
  }
});
console.log("res", res);

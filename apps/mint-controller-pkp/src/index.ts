import ethers from 'ethers'
import siwe from 'siwe'
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LitNodeClientNodeJs as LitNodeClient } from "@lit-protocol/lit-node-client-nodejs";
import { AuthSig } from '@lit-protocol/types';

export interface Env {
  MINT_PKP_PRIVATE_KEY: string;
  IPFS_CID_PAY_TEACHER_FROM_CONTROLLER: string;
  LIT_NETWORK: "cayenne" | "custom" | "localhost" | "manzano" | "habanero" | undefined;
  CHRONICLE_RPC: string;
  DOMAIN: string;
  ORIGIN: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const {keyId} = await request.json() as {
      keyId: string
    }

    const provider = new ethers.JsonRpcProvider("https://chain-rpc.litprotocol.com/http");
    const privKey = env.MINT_PKP_PRIVATE_KEY;
    const wallet = new ethers.Wallet(privKey, provider);
    const NETWORK = env.LIT_NETWORK;
    const litNodeClient = new LitNodeClient({ network: NETWORK });
    await litNodeClient.connect();

    const authSig = await generateSig()
    const mintAndBurnResult = await mintAndBurnPKP();
    return mintAndBurnResult || new Response("Mint and Burn Failed", { status: 500 });

    async function mintAndBurnPKP () {
      const contractClient = new LitContracts({ signer: wallet, network: env.LIT_NETWORK});
      await contractClient.connect();

      // const mintCost = await contractClient.pkpNftContract.read.mintCost();

      let claimActionRes;
      try {
      claimActionRes = await litNodeClient.executeJs({
        authSig,
        code: `(async () => {
Lit.Actions.claimKey({keyId});
})();`,
        authMethods: [],
        jsParams: {
          keyId
        },
      })
      } catch(error) {
        console.error(error);
        throw new Error(`Lit Action failed`)
      }
      if (claimActionRes && claimActionRes.claims) {

        let claimAndMintResult, tokenId, mintTx;
        try {
        claimAndMintResult = await contractClient.pkpNftContractUtils.write.claimAndMint(claimActionRes.claims[0].derivedKeyId, claimActionRes.claims[0].signatures)
        tokenId = claimAndMintResult.tokenId;
        mintTx = claimAndMintResult.tx;
        } catch(error) {
          console.error(error)
          throw new Error(`Claim and Mint tx failed`)
        }
        let burnTx;
        try {
        burnTx = await contractClient.pkpNftContract.write.burn(tokenId);
        console.log("burnTx", burnTx);
        } catch(error) {
          console.error(error);
          throw new Error(`Burn tx failed`)
        }
        return new Response(JSON.stringify({ mintTx, burnTx }), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }
    async function generateSig (): Promise<AuthSig> {
      const domain = env.DOMAIN;
      const origin = env.ORIGIN;
      const statement = "This is a test statement.  You can put anything you want here.";
      const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      let nonce = litNodeClient.getLatestBlockhash();
      if (typeof nonce !== "string") {
        throw new Error(`retrieved nonce from blockhash not a string`)
      }
      const siweMessage = new siwe.SiweMessage({
        domain,
        address: wallet.address,
        statement,
        uri: origin,
        version: "1",
        chainId: 1,
        nonce,
        expirationTime,
      });

      const messageToSign = siweMessage.prepareMessage();

      const signature = await wallet.signMessage(messageToSign);

      const recoveredAddress = ethers.verifyMessage(messageToSign, signature);

      if (recoveredAddress !== wallet.address) {
        throw new Error("Recovered address does not match wallet address");
      }

      const authSig = {
        sig: signature,
        derivedVia: "web3.eth.personal.sign",
        signedMessage: messageToSign,
        address: recoveredAddress,
      };

      console.log("authSig", authSig);
      return authSig;
    }
  }
}

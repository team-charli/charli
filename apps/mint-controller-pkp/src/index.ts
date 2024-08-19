import ethers from 'ethers'
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LitNodeClientNodeJs as LitNodeClient } from "@lit-protocol/lit-node-client-nodejs";
import { AuthCallback, LIT_NETWORKS_KEYS, LitAbility } from '@lit-protocol/types';
import { LitActionResource, createSiweMessageWithRecaps } from '@lit-protocol/auth-helpers';

// ... rest of your code remains the same

export interface Env {
  PRIVATE_KEY: string;
  LIT_NETWORK: LIT_NETWORKS_KEYS;
  // DOMAIN: string;
  // ORIGIN: string;
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
    const privKey = env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privKey, provider);
    const NETWORK = env.LIT_NETWORK   ;
    const litNodeClient = new LitNodeClient({ litNetwork: NETWORK });
    await litNodeClient.connect();

    const sessionSigsFunction = async() => {
      const authNeededCallback: AuthCallback = async ({
        uri,
        expiration,
        resourceAbilityRequests,
      }) => {

        // Prepare the SIWE message for signing
        if (!uri) throw new Error('no uri')
        if (!expiration) throw new Error('no expiration')
        if (!resourceAbilityRequests) throw new Error('no resourceAbilityRequests')
        const toSign = await createSiweMessageWithRecaps({
          uri: uri,
          expiration: expiration,
          resources: resourceAbilityRequests,
          walletAddress: wallet.address,
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient: litNodeClient,
        });
        // Use Ethereum wallet to sign message. return signature
        const signature = await wallet.signMessage(toSign);

        // Create AuthSig using derived signature, message, and wallet address

        const authSig = {
          sig: signature,
          derivedVia: "web3.eth.personal.sign",
          signedMessage: toSign,
          address: wallet.address,
        };

        return authSig;
      };

      // Create a session key and sign it using the authNeededCallback defined above
      const sessionSigs = await litNodeClient.getSessionSigs({
        chain: "ethereum",
        resourceAbilityRequests: [
          {
            resource: new LitActionResource("*"),
            ability: LitAbility.LitActionExecution,
          },
        ],
        authNeededCallback,
      });

      return sessionSigs;
    };

    const sessionSigs = await sessionSigsFunction();


    const mintAndBurnResult = await mintAndBurnPKP();

    return mintAndBurnResult || new Response("Mint and Burn Failed", { status: 500 });

    async function mintAndBurnPKP () {
      const contractClient = new LitContracts({ signer: wallet, network: env.LIT_NETWORK});
      await contractClient.connect();

      // const mintCost = await contractClient.pkpNftContract.read.mintCost();

      let claimActionRes;
      try {
        claimActionRes = await litNodeClient.executeJs({
          sessionSigs,
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
  }
}

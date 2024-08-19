import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import * as LitNodeClient from "https://esm.sh/@lit-protocol/lit-node-client-nodejs";
import { AuthCallback, LitAbility } from "https://esm.sh/@lit-protocol/types";
import { LitActionResource, createSiweMessageWithRecaps } from "https://esm.sh/@lit-protocol/auth-helpers";
import { corsHeaders } from '../_shared/cors.ts';

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";


Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === "POST") {
    try {
      const body = await req.text();
      let keyId;
      try {
        const json = JSON.parse(body);
        keyId = json.keyId;
      } catch (parseError) {
        console.error(parseError)
      }

      if (!keyId) {
        console.error("Missing keyId in request");
        return new Response(JSON.stringify({ error: "Missing keyId in request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const litNodeClient = new LitNodeClient.LitNodeClientNodeJs({ litNetwork: LIT_NETWORK });
      await litNodeClient.connect();
      console.log("LitNodeClient connected");

      const sessionSigs = await getSessionSigs(litNodeClient, wallet);
      console.log("Session signatures obtained");

      const mintAndBurnResult = await mintAndBurnPKP(keyId, sessionSigs, litNodeClient, wallet);
      console.log("Mint and burn completed", { result: mintAndBurnResult });
      await litNodeClient.disconnect()

      return new Response(JSON.stringify(mintAndBurnResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Unexpected error", { error: error.message, stack: error.stack });

      return new Response(JSON.stringify({ error: "Unexpected error occurred", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {

    console.log("Method not allowed", { method: req.method });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getSessionSigs(litNodeClient: any, wallet: ethers.Wallet) {
  const authNeededCallback: AuthCallback = async ({
    uri,
    expiration,
    resourceAbilityRequests,
  }) => {
    if (!uri || !expiration || !resourceAbilityRequests) {
      await litNodeClient.disconnect()
      throw new Error("Missing required parameters");
    }

    const toSign = await createSiweMessageWithRecaps({
      uri: uri,
      expiration: expiration,
      resources: resourceAbilityRequests,
      walletAddress: wallet.address,
      nonce: await litNodeClient.getLatestBlockhash(),
      litNodeClient: litNodeClient,
    });

    const signature = await wallet.signMessage(toSign);

    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: toSign,
      address: wallet.address,
    };
  };

  return await litNodeClient.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: [
      {
        resource: new LitActionResource("*"),
        ability: LitAbility.LitActionExecution,
      },
    ],
    authNeededCallback,
  });
}

async function mintAndBurnPKP(keyId: string, sessionSigs: any, litNodeClient: any, wallet: ethers.Wallet) {
  console.log("Starting mintAndBurnPKP", { keyId });
  try {
    const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
    await contractClient.connect();

    const claimActionRes = await litNodeClient.executeJs({
      sessionSigs,
      code: `(async () => { Lit.Actions.claimKey({keyId}); })();`,
      jsParams: { keyId },
    });
    console.log("Claim action executed");
    console.log("claimActionRes", claimActionRes )

    if (claimActionRes && claimActionRes.claims) {

      console.log({derivedKeyId: claimActionRes.claims[keyId].derivedKeyId,
        signatures: claimActionRes.claims[keyId].signatures })

      let claimAndMintResult;
      try {
        console.log('Before claimAndMint:', {
          derivedKeyId: claimActionRes.claims[keyId].derivedKeyId,
          signaturesLength: claimActionRes.claims[keyId].signatures.length
        });

        claimAndMintResult = await contractClient.pkpNftContractUtils.write.claimAndMint(
          `0x${claimActionRes.claims[keyId].derivedKeyId}`,
          claimActionRes.claims[keyId].signatures
        );

        console.log('After claimAndMint:', claimAndMintResult);
      } catch (error) {
        console.error('Detailed error:', {
          message: error.message,
          name: error.name,
          cause: error.cause,
          stack: error.stack,
          ...error
        });
        throw error;
      }

      console.log("Claim and mint completed", { result: claimAndMintResult });

      const mintTx = claimAndMintResult.tx;
      console.log("mintTx", mintTx)
      const mintTxReceipt = await mintTx.wait();
      const tokenId = mintTxReceipt.events[0].topics[1];
      console.log("tokenId", tokenId)


      const burnTx = await contractClient.pkpNftContract.write.burn(tokenId).catch(e => console.error(e));
      console.log("Burn transaction completed", { burnTx });

      await litNodeClient.disconnect()
      return { mintTx, burnTx };

    } else {
      await litNodeClient.disconnect()

      throw new Error("Claim action did not return expected results");
    }
  } catch (error) {
    console.log("Error in mintAndBurnPKP", { error: error.message, stack: error.stack });
    await litNodeClient.disconnect()

    throw error;
  }
}

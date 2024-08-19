import { ethers } from "https://esm.sh/ethers@5.7.2";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import { LitNodeClient } from "https://esm.sh/@lit-protocol/lit-node-client";
import { AuthCallback, LitAbility } from "https://esm.sh/@lit-protocol/types";
import { LitActionResource, createSiweMessageWithRecaps } from "https://esm.sh/@lit-protocol/auth-helpers";

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "";

Deno.serve(async (req) => {
  if (req.method === "POST") {
    try {
      const { keyId } = await req.json();

      const provider = new ethers.providers.JsonRpcProvider("https://chain-rpc.litprotocol.com/http");
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const litNodeClient = new LitNodeClient({ litNetwork: LIT_NETWORK });
      await litNodeClient.connect();

      const sessionSigs = await getSessionSigs(litNodeClient, wallet);
      const mintAndBurnResult = await mintAndBurnPKP(keyId, sessionSigs, litNodeClient, wallet);

      return new Response(JSON.stringify(mintAndBurnResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: "Mint and Burn Failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
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
  const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
  await contractClient.connect();

  let claimActionRes = await litNodeClient.executeJs({
    sessionSigs,
    code: `(async () => { Lit.Actions.claimKey({keyId}); })();`,
    authMethods: [],
    jsParams: { keyId },
  });

  if (claimActionRes && claimActionRes.claims) {
    const claimAndMintResult = await contractClient.pkpNftContractUtils.write.claimAndMint(
      claimActionRes.claims[0].derivedKeyId,
      claimActionRes.claims[0].signatures
    );
    const tokenId = claimAndMintResult.tokenId;
    const mintTx = claimAndMintResult.tx;

    const burnTx = await contractClient.pkpNftContract.write.burn(tokenId);
    console.log("burnTx", burnTx);

    return { mintTx, burnTx };
  }

  throw new Error("Claim action failed");
}

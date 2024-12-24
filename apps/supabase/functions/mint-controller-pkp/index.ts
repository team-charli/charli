import { Hono } from 'jsr:@hono/hono'
import { createClient } from 'jsr:@supabase/supabase-js'
import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import * as LitNodeClient from "https://esm.sh/@lit-protocol/lit-node-client-nodejs";
import { corsHeaders } from '../_shared/cors.ts';

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabaseClient = createClient(supabaseUrl, supabaseKey)

const pkpContract = {
  dev: {
    address: Deno.env.get("DEV_PKP_NFT_CONTRACT_ADDRESS"),
  },
  test: {
    address: Deno.env.get("TEST_PKP_NFT_CONTRACT_ADDRESS"),
  },
  production: {
    address: Deno.env.get("PROD_PKP_NFT_CONTRACT_ADDRESS"),
  }
};

type Environment = 'dev' | 'test' | 'production';

interface RequestBody {
  sessionId: number;
  env: Environment;
}

interface Signature {
  r: string;
  s: string;
  v: number;
}

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

// Create the Hono app
const app = new Hono();
app.use('*', async (c, next) => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.header(key, value);
  }
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  await next();
});

/**
 * Main route: POST /
 * Mint and burn PKP based on the sessionId & env passed in request body.
 */
app.post('/', async (c) => {
  try {
    const body = (await c.req.json()) as RequestBody;
    validateRequest(body);

    const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const pkpNftContractAddress = getPkpNftContractAddress(body.env);

    const litNodeClient = new LitNodeClient.LitNodeClientNodeJs({ litNetwork: LIT_NETWORK });
    await litNodeClient.connect();
    console.log("LitNodeClient connected");
    console.log("Session signatures obtained");

    const mintAndBurnResult = await mintAndBurnPKP(body.sessionId, litNodeClient, wallet, pkpNftContractAddress);
    console.log("Mint and burn completed", { result: mintAndBurnResult });

    return c.json(mintAndBurnResult, 200);
  } catch (error: any) {
    console.error("Error processing request", { error: error.message, stack: error.stack });
    const status = error instanceof BadRequestError ? 400 : 500;
    return c.json({ error: error.message }, status);
  }
});

/***********************************************************************
 * Helper functions (placed after the route)
 ***********************************************************************/

function validateRequest(body: RequestBody) {
  if (!body.sessionId) {
    throw new BadRequestError("Invalid or missing sessionId");
  } else if (!body.env || !['dev', 'test', 'production'].includes(body.env)) {
    throw new BadRequestError("Invalid or missing environment in request");
  }
}

function getPkpNftContractAddress(env: Environment): string {
  const address = pkpContract[env]?.address;
  if (!address) {
    throw new Error(`Missing contract address for environment: ${env}`);
  }
  return address;
}

/**
 * Restore ECDSA signatures from condensed base64 strings
 */
function restoreSignatures(condensedSigs: string[]): Signature[] {
  return condensedSigs.map(condensedSig => {
    // Decode the Base64 string to Uint8Array
    const bytes = ethers.utils.base64.decode(condensedSig);
    // Convert Uint8Array to hex string
    const hexString = ethers.utils.hexlify(bytes);
    // Extract r, s, and v
    const r = ethers.utils.hexDataSlice(hexString, 0, 32);
    const s = ethers.utils.hexDataSlice(hexString, 32, 64);
    const v = ethers.utils.hexDataSlice(hexString, 64);
    return {
      r,
      s,
      v: ethers.BigNumber.from(v).toNumber()
    };
  });
}

async function getPkpInfoFromMintReceipt(txReceipt: ethers.ContractReceipt, litContractsClient: LitContracts) {
  // This is the 'PKPMinted' event signature from the contract logs
  const pkpMintedEvent = txReceipt.events?.find(
    (event) => event.topics[0] === "0x3b2cc0657d0387a736293d66389f78e4c8025e413c7a1ee67b7707d4418c46b8"
  );

  if (!pkpMintedEvent) {
    throw new Error("PKP Minted event not found in transaction receipt");
  }

  const publicKey = "0x" + pkpMintedEvent.data.slice(130, 260);
  const tokenId = ethers.utils.keccak256(publicKey);
  const ethAddress = await litContractsClient.pkpNftContract.read.getEthAddress(tokenId);

  return {
    tokenId: ethers.BigNumber.from(tokenId).toString(),
    publicKey,
    ethAddress,
  };
}

async function mintAndBurnPKP(
  sessionId: number,
  litNodeClient: LitNodeClient,
  wallet: ethers.Wallet,
  pkpNftContractAddress: ethers.AddressLike
) {
  try {
    const { data, error } = await supabaseClient
      .from('sessions')
      .select('key_claim_data')
      .eq('session_id', sessionId);

    if (error) throw new Error(error);
    if (!data || data.length === 0) throw new Error("No data found for the given sessionId");

    const keyClaimData = data[0].key_claim_data;
    if (!keyClaimData) throw new Error("keyClaimData null or undefined");

    const derivedKeyId = keyClaimData.derivedKeyId;
    const condensedSigs = keyClaimData.condensedSigs;
    const signatures = restoreSignatures(condensedSigs);

    const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
    await contractClient.connect();
    const pkpMintCost = await contractClient.pkpNftContract.read.mintCost();

    // Perform the claimAndMint
    const claimAndMintTx = await contractClient.pkpNftContract.write.claimAndMint(
      2,
      `0x${derivedKeyId}`,
      signatures,
      { value: pkpMintCost }
    );
    const claimAndMintReceipt = await claimAndMintTx.wait(1);
    console.log('claimAndMintTx: ', claimAndMintTx);

    const pkpInfo = await getPkpInfoFromMintReceipt(claimAndMintReceipt, contractClient);
    console.log("Claim and mint completed", { pkpInfo });

    // Burn the newly minted token
    const erc721Abi = [
      "function transferFrom(address from, address to, uint256 tokenId)"
    ];
    const contract = new ethers.Contract(pkpNftContractAddress, erc721Abi, wallet);
    const burnAddress = "0x0000000000000000000000000000000000000001";
    const burnTx = await contract.transferFrom(wallet.address, burnAddress, pkpInfo.tokenId);
    const burnReceipt = await burnTx.wait(1);
    console.log("Burn transaction completed", { burnReceipt });

    return {
      mintTxHash: claimAndMintTx.hash,
      burnTxHash: burnTx.hash,
      pkpInfo
    };
  } catch (error) {
    console.error("Error in mintAndBurnPKP", { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await litNodeClient.disconnect();
  }
}

// Finally, export the Hono app
export default app;

///Users/zm/Projects/charli/apps/supabase/functions/mint-controller-pkp/index.ts
import { Hono } from 'jsr:@hono/hono'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import * as LitNodeClient from "https://esm.sh/@lit-protocol/lit-node-client-nodejs@7";
import { corsHeaders } from '../_shared/cors.ts';
const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
app.post('/mint-controller-pkp', async (c) => {
  try {
    const body = (await c.req.json()) as RequestBody;
    console.log("Request body parsed:", body);
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


async function mintAndBurnPKP(
  sessionId: number,
  litNodeClient: LitNodeClient,
  wallet: ethers.Wallet,
  pkpNftContractAddress: ethers.AddressLike
) {
  try {
    console.log("sessionId", sessionId);
    const { data, error } = await supabaseClient
      .from('sessions')
      .select('key_claim_data')
      .eq('session_id', sessionId);

    console.log("Query result:", { data, error }); // Add this line
    if (error) throw new Error(error);
    if (!data || data.length === 0) throw new Error("No data found for the given sessionId");

    const keyClaimData = data[0].key_claim_data;
    if (!keyClaimData) throw new Error("keyClaimData null or undefined");

    const derivedKeyId = keyClaimData.derivedKeyId;
    const condensedSigs = keyClaimData.condensedSigs;
    const signatures = restoreSignatures(condensedSigs);
    const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");

    const contractClient = new LitContracts({
      signer: wallet,
      network: 'datil-dev',
      provider,
      debug: false,
      options: {
        storeOrUseStorageKey: false,
      },
    });
    await contractClient.connect();
        const abi = [
      // 1) The mintCost() function definition:
      {
        "inputs": [],
        "name": "mintCost",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },

      // 2) The claimAndMint(...) function definition:
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "keyType",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "derivedKeyId",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "r",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "s",
                "type": "bytes32"
              },
              {
                "internalType": "uint8",
                "name": "v",
                "type": "uint8"
              }
            ],
            "internalType": "struct IPubkeyRouter.Signature[]",
            "name": "signatures",
            "type": "tuple[]"
          },
          {
            "internalType": "address",
            "name": "stakingContractAddress",
            "type": "address"
          }
        ],
        "name": "claimAndMint",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "payable",
        "type": "function"
      }
    ];

    const pkpNftAddress = "0x02C4242F72d62c8fEF2b2DB088A35a9F4ec741C7";
    const pkpNftContract = new ethers.Contract(pkpNftAddress, abi, wallet);

    const pkpMintCost = await pkpNftContract.mintCost();
    const stakingContractAddress = '0xD4507CD392Af2c80919219d7896508728f6A623F';

    console.log('PKP Mint Cost:', pkpMintCost.toString());
    console.log('Wallet Balance:', await wallet.getBalance());
    console.log('Gas Price:', (await wallet.provider.getGasPrice()).toString());
    console.log("derivedKeyId", derivedKeyId);
    // Perform the claimAndMint
    const formattedDerivedKeyId = ethers.utils.hexlify(
      ethers.utils.hexZeroPad(`0x${derivedKeyId}`, 32)
    );

    console.log("formatted derivedKeyId", formattedDerivedKeyId);
    console.log("contractClient.pkpNftContract.write.address", contractClient.pkpNftContract.write.address);
    const claimAndMintTx = await pkpNftContract.claimAndMint(
      2,
      formattedDerivedKeyId,
      signatures,
      stakingContractAddress,
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
    const burnTx = await contract.transferFrom(wallet.address, burnAddress, pkpInfo.tokenId, {
      gasLimit: 100000,
      value: 0
    });
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

Deno.serve(async (req) => {
  try {
    const response = await app.fetch(req);
    return response;
  } catch (error) {
    console.error("Error in request handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});


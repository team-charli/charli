import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import * as LitNodeClient from "https://esm.sh/@lit-protocol/lit-node-client-nodejs";
import { corsHeaders } from '../_shared/cors.ts';

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";
const RELAYER_TOKEN_ID = Deno.env.get("ETHEREUM_RELAYER_TOKEN_ID");

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

function getPkpNftContractAddress(env: Environment): string {
  const address = pkpContract[env]?.address;
  if (!address) {
    throw new Error(`Missing contract address for environment: ${env}`);
  }
  return address;
}

interface RequestBody {
  keyType: number;
  derivedKeyId: string;
  signatures: string[];
  env: Environment;
  ipfsIdsToRegister: string[];
}

Deno.serve(async (req: Request) => {
  let provider: ethers.JsonRpcProvider;
  let wallet: ethers.Wallet;
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await parseRequestBody(req);
    validateRequest(body);

    provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const pkpNftContractAddress = getPkpNftContractAddress(body.env);

    const litNodeClient = new LitNodeClient.LitNodeClientNodeJs({ litNetwork: LIT_NETWORK });

    await litNodeClient.connect();
    console.log("LitNodeClient connected");

    console.log("Session signatures obtained");

    const mintAndBurnResult = await mintAndBurnPKP(body.keyType, body.derivedKeyId, body.signatures, litNodeClient, wallet, pkpNftContractAddress, body.ipfsIdsToRegister);
      console.log("Mint and burn completed", { result: mintAndBurnResult });

    await litNodeClient.disconnect();

    return new Response(JSON.stringify(mintAndBurnResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request", { error: error.message, stack: error.stack });
    return new Response(JSON.stringify({ error: error.message }), {
      status: error instanceof BadRequestError ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function parseRequestBody(req: Request): Promise<RequestBody> {
  const body = await req.text();
  try {
    return JSON.parse(body);
  } catch (parseError) {
    throw new BadRequestError("Invalid JSON in request body" + parseError);
  }
}

function validateRequest(body: RequestBody) {
  if (!body.keyType) {
    throw new BadRequestError("Missing keyId in request");
  } else if (body.signatures.length < 1) {
    throw new BadRequestError("Missing signatures in request");
  } else if (!body.derivedKeyId) {
    throw new BadRequestError("Missing derivedKeyId in request");
   } else if (!body.env || !['dev', 'test', 'production'].includes(body.env)) {
    throw new BadRequestError("Invalid or missing environment in request");
  } else if (body.ipfsIdsToRegister.length < 1) {
    throw new BadRequestError("No ipfsIdToRegister array passed")
  }
}


async function mintAndBurnPKP(keyType: number, derivedKeyId: string, signatures: string[], litNodeClient: LitNodeClient, wallet: ethers.Wallet, pkpNftContractAddress: ethers.AddressLike, ipfsIdsToRegister: string[]) {
  const approveIpfsId = ipfsIdsToRegister[0];
  const transferFromIpfsId = ipfsIdsToRegister[1]
  try {
    const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
    await contractClient.connect();
    const pkpMintCost = await contractClient.pkpNftContract.read.mintCost();

    const claimAndMintTx = await contractClient.pkpNftContract.write.claimAndMint(keyType, `0x${derivedKeyId}`, signatures, {value: pkpMintCost});
    const claimAndMintReceipt = await claimAndMintTx.wait(1);
    console.log('claimAndMintTx: ', claimAndMintTx);

    const pkpInfo = await getPkpInfoFromMintReceipt(claimAndMintReceipt, contractClient);
    console.log("Claim and mint completed", { pkpInfo });

    const erc721Abi =  [
        "function transferFrom(address from, address to, uint256 tokenId)"
    ];

    const contract = new ethers.Contract(pkpNftContractAddress, erc721Abi, wallet);
    const burnAddress = "0x0000000000000000000000000000000000000001";
    const burnTx = await contract.transferFrom(wallet.address, burnAddress, pkpInfo.tokenId);
    const burnReceipt = await burnTx.wait(1);

    console.log("Burn transaction completed", { burnReceipt });

    return { mintTxHash: claimAndMintTx.hash, burnTxHash: burnTx.hash, pkpInfo  };
  } catch (error) {
    console.error("Error in mintAndBurnPKP", { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await litNodeClient.disconnect();
  }
}

async function getPkpInfoFromMintReceipt(txReceipt: ethers.ContractReceipt, litContractsClient: LitContracts) {
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

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

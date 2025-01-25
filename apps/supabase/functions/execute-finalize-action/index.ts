///Users/zm/Projects/charli/apps/supabase/functions/execute-finalize-action/index.ts

import { Hono } from 'jsr:@hono/hono';
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { AccessControlConditions } from "https://esm.sh/@lit-protocol/types";
import { ethers } from "https://esm.sh/ethers@5.7.0";

import { corsHeaders } from '../_shared/cors.ts'
import {sessionSigsForDecryptInAction} from  '../_shared/generateControllerWalletSessionSig.ts'
import * as rawCodec from "https://esm.sh/multiformats/codecs/raw"
import { sha256 } from "https://esm.sh/multiformats/hashes/sha2"
import { CID } from "https://esm.sh/multiformats/cid"

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const PINATA_GATEWAY = "chocolate-deliberate-squirrel-286.mypinata.cloud";
const FINALIZE_LIT_ACTION_IPFS_CID = Deno.env.get('FINALIZE_LIT_ACTION_IPFS_CID') ?? "";
const daiContractAddress = Deno.env.get('DAI_CONTRACT_ADDRESS');
const relayerIpfsId = Deno.env.get('RELAYER_IPFS_ID');
const env = Deno.env.get('ACTION_ENV');
const rpcChain = Deno.env.get('ACTION_RPC_CHAIN');
const rpcChainId = Deno.env.get('ACTION_RPC_CHAIN_ID');

interface UserFinalRecord {
  role: 'teacher' | 'learner'
  peerId: string | null
  roomId: string | null
  joinedAt: number | null
  leftAt: number | null
  duration: number | null
  hashedTeacherAddress: string
  hashedLearnerAddress: string
  sessionDuration: number
  sessionSuccess: boolean
  faultType: string | null
  sessionComplete: boolean
  isFault: boolean | null
}

interface PinataPayload {
  teacherData: UserFinalRecord
  learnerData: UserFinalRecord
  scenario: 'fault' | 'non_fault'
  timestamp: number
  roomId: string
}

const app = new Hono();

app.use('*', async (c, next) => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.header(key, value);
  }
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  await next();
});
/** POST endpoint: Handles session finalization logic */
app.post('/execute-finalize-action', async (c) => {
  try {
    // Expect { pinataPayload, sessionDataIpfsHash, finalizationType, faultData, roomId, ...etc }
    const body = await c.req.json();

    const pinataPayload = body?.pinataPayload;
    const sessionDataIpfsHash = body?.sessionDataIpfsHash;
    const finalizationType = body?.finalizationType;
    const faultData = body?.faultData;
    const roomId = body?.roomId;
    const teacherAddressCiphertext = body?.teacherAddressCiphertext;
    const teacherAddressEncryptHash = body?.teacherAddressEncryptHash;
    const learnerAddressCiphertext = body?.learnerAddressCiphertext;
    const learnerAddressEncryptHash = body?.learnerAddressEncryptHash;

    // 1) Validate the structure of the pinataPayload
    if (!validatePinataPayload(pinataPayload)) {
      return c.json( { error: { message: 'Invalid Pinata payload structure', code: 'INVALID_PAYLOAD' } }, 400, { ...corsHeaders, 'Content-Type': 'application/json' });
    }

    // 2) Fetch the session data bytes from IPFS
    const sessionDataBytes = await fetchFromIPFSAsBytes(sessionDataIpfsHash);

    // 3) Compare the pinned object to the in-memory payload
    if (!comparePayloads(pinataPayload, sessionDataBytes)) {
      return c.json( { error: { message: 'Pinata payload does not match IPFS data', code: 'PAYLOAD_MISMATCH' } }, 400, { ...corsHeaders, 'Content-Type': 'application/json' });
    }

    // 4) Validate that the pinned data’s CID actually matches
    const isValid = await validateIPFSDataBytes(sessionDataBytes, sessionDataIpfsHash);
    if (!isValid) {
      return c.json( { error: { message: 'Session data verification failed - CID mismatch', code: 'VALIDATION_ERROR' } }, 400, { ...corsHeaders, 'Content-Type': 'application/json' });
    }

    // 5) Parse the session data
    //const sessionDataObject = JSON.parse(new TextDecoder().decode(sessionDataBytes));

    // Proceed with Lit Action logic:
    // -----------------------------------------------------------
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: 'datil-dev' });
    // @ts-ignore: esm litNodeClient types
    await litNodeClient.connect();
    // Obtain session signatures
        const accessControlConditions: AccessControlConditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "eth_getBalance",
        parameters: [":userAddress", "latest"],
        returnValueTest: {
          comparator: ">=",
          value: "0",
        },
      },
    ];

  const sessionSigs = await sessionSigsForDecryptInAction(
        wallet,
        litNodeClient,
        accessControlConditions,
        learnerAddressEncryptHash
      );

    // @ts-ignore: esm litNodeClient types


    // @ts-ignore: esm litNodeClient types
    const results = await litNodeClient.executeJs({
      code: FINALIZE_LIT_ACTION_IPFS_CID,
      sessionSigs,
      jsParams: {
        ipfsCID: sessionDataIpfsHash,
        finalizationType,
        faultData,
        roomId,
        accessControlConditions,
        teacherAddressCiphertext,
        teacherAddressEncryptHash,
        learnerAddressCiphertext,
        learnerAddressEncryptHash,
        daiContractAddress,
        relayerIpfsId,
        env,
        rpcChain,
        rpcChainId
      },
    });

    // @ts-ignore:esm litNodeClient types
    await litNodeClient.disconnect();

    return c.json( { transactionHash: results.response.transactionHash, litActionIpfsHash: results.response.ipfsHash, verifiedSessionCID: sessionDataIpfsHash, }, 200, { ...corsHeaders, 'Content-Type': 'application/json' });

  } catch (e: unknown) {
    const error = e as Error & { code?: string };
    console.error('Error processing request:', error);

    return c.json( { error: { message: error.message, code: error.code || 'UNKNOWN_ERROR', }, }, 500, { ...corsHeaders, 'Content-Type': 'application/json' });
  }
});

/** Handle OPTIONS for CORS Preflight */
app.options('/', (c) => {
  return c.newResponse(null, 204, corsHeaders);
});

/** Helper: fetch raw bytes from IPFS */
async function fetchFromIPFSAsBytes(ipfsHash: string): Promise<Uint8Array> {
  const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  const rawData = await response.arrayBuffer();
  return new Uint8Array(rawData);
}

/** Compare pinned object to the DO-supplied data */
function comparePayloads(provided: PinataPayload, fetchedBytes: Uint8Array): boolean {
  const fetchedObject = JSON.parse(new TextDecoder().decode(fetchedBytes));
  return JSON.stringify(provided) === JSON.stringify(fetchedObject);
}

/** Validate the pinned data matches the provided CID */
async function validateIPFSDataBytes(data: Uint8Array, providedCID: string): Promise<boolean> {
  const hash = await sha256.digest(data);
  const calculatedCID = CID.create(1, rawCodec.code, hash);
  return calculatedCID.toString() === providedCID;
}

/** Validate Pinata Payload structure (same logic from test-finalize) */
function validatePinataPayload(payload: any): payload is PinataPayload {
  if (!payload) return false;
  const validScenario = ['fault', 'non_fault'].includes(payload.scenario);
  return (
    !!payload.teacherData &&
      !!payload.learnerData &&
      validScenario &&
      typeof payload.timestamp === 'number' &&
      typeof payload.roomId === 'string'
  );
}


// Use the Hono app with Deno Deploy
Deno.serve(async (req) => {
  try {
    return await app.fetch(req);
  } catch (error: unknown) {
    console.error("Error in request handler:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

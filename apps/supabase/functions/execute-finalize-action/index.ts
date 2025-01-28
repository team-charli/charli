///Users/zm/Projects/charli/apps/supabase/functions/execute-finalize-action/index.ts
import { Hono } from 'jsr:@hono/hono';
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { AccessControlConditions } from 'https://esm.sh/@lit-protocol/types';
import { ethers } from 'https://esm.sh/ethers@5.7.0';

import { corsHeaders } from '../_shared/cors.ts';
import { sessionSigsForDecryptInAction } from '../_shared/generateControllerWalletSessionSig.ts';
import * as rawCodec from 'https://esm.sh/multiformats/codecs/raw';
import { sha256 } from 'https://esm.sh/multiformats/hashes/sha2';
import { CID } from 'https://esm.sh/multiformats/cid';

// NOTE: production usage might use a more restricted key or burned PKP
const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_WORKER_WALLET") ?? "";
const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const PINATA_GATEWAY = "chocolate-deliberate-squirrel-286.mypinata.cloud";
const FINALIZE_LIT_ACTION_IPFS_CID = Deno.env.get('FINALIZE_LIT_ACTION_IPFS_CID') ?? "";
const daiContractAddress = Deno.env.get('DAI_CONTRACT_ADDRESS_BASE_SEPOLIA');
const relayerIpfsId = Deno.env.get('RELAYER_IPFS_ID');
const env = Deno.env.get('ACTION_ENV');
const rpcChain = Deno.env.get('ACTION_RPC_CHAIN');
const rpcChainId = Deno.env.get('ACTION_RPC_CHAIN_ID');

interface UserFinalRecord {
  role: 'teacher' | 'learner';
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  sessionDuration: number;
  sessionSuccess: boolean;
  faultType: string | null;
  sessionComplete: boolean;
  isFault: boolean | null;
}

interface PinataPayload {
  teacherData: UserFinalRecord;
  learnerData: UserFinalRecord;
  scenario: 'fault' | 'non_fault';
  timestamp: number;
  roomId: string;
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

app.post('/execute-finalize-action', async (c) => {
  const litNodeClient = new LitNodeClientNodeJs({ litNetwork: 'datil-dev', debug: false });
  console.log('[execute-finalize-action] Starting request...');

  try {
    console.log('[execute-finalize-action] Parsing request JSON body...');
    const body = await c.req.json();
    console.log('[execute-finalize-action] Body received:', JSON.stringify(body, null, 2));

    // In addition to pinataPayload, check any other fields you consider "required".
    // If your action absolutely requires finalizationType, faultData, roomId, etc.,
    // we gather them here:
    const requiredFields = [
      'pinataPayload',
      'sessionDataIpfsHash',
      'finalizationType',
      'faultData',
      'roomId',
      'teacherAddressCiphertext',
      'teacherAddressEncryptHash',
      'learnerAddressCiphertext',
      'learnerAddressEncryptHash',
      'controllerAddress'
    ];

    const {
      pinataPayload,
      sessionDataIpfsHash,
      teacherAddressCiphertext,
      teacherAddressEncryptHash,
      learnerAddressCiphertext,
      learnerAddressEncryptHash,
      controllerAddress,
      // We rename these three so they don't collide
      finalizationType: topLevelFinalizationType,
      faultData: topLevelFaultData,
      roomId: topLevelRoomId,
    } = body;

    // Derive finalizationType, faultData, and roomId from the body if present,
    // otherwise fallback to pinataPayload scenario/roomId:
    const finalizationTypeResolved =
      topLevelFinalizationType ?? pinataPayload?.scenario ?? 'non_fault';

    const faultDataResolved =
      topLevelFaultData ??
      (pinataPayload?.scenario === 'fault'
        ? {
            teacherIsFault: pinataPayload.teacherData.isFault,
            learnerIsFault: pinataPayload.learnerData.isFault
          }
        : null);

    const roomIdResolved =
      topLevelRoomId ?? pinataPayload?.roomId ?? '';

    // Next, validate pinataPayload shape:
    console.log('[execute-finalize-action] Checking pinataPayload structure...');
    if (!validatePinataPayload(pinataPayload)) {
      console.error('[execute-finalize-action] Invalid pinataPayload structure:', pinataPayload);
      return c.json(
        { error: { message: 'Invalid Pinata payload structure', code: 'INVALID_PAYLOAD' } },
        400,
        { ...corsHeaders, 'Content-Type': 'application/json' }
      );
    }

    // If we got here, none of the top-level fields are missing and pinataPayload is valid.

    console.log('[execute-finalize-action] Fetching session data bytes from IPFS:', sessionDataIpfsHash);
    const sessionDataBytes = await fetchFromIPFSAsBytes(sessionDataIpfsHash);
    console.log(`[execute-finalize-action] Fetched ${sessionDataBytes.length} bytes from IPFS.`);

    console.log('[execute-finalize-action] Comparing pinned object to in-memory payload...');
    if (!comparePayloads(pinataPayload, sessionDataBytes)) {
      console.error('[execute-finalize-action] Payload mismatch. Provided vs fetched differ.');
      return c.json(
        { error: { message: 'Pinata payload does not match IPFS data', code: 'PAYLOAD_MISMATCH' } },
        400,
        { ...corsHeaders, 'Content-Type': 'application/json' }
      );
    } else {
      console.log('[execute-finalize-action] Pinata payload matches IPFS data');
    }

    console.log('[execute-finalize-action] Validating pinned data’s CID...');
    const isValid = await validateIPFSDataBytes(sessionDataBytes, sessionDataIpfsHash);
    if (!isValid) {
      console.error('[execute-finalize-action] CID mismatch. Provided CID does not match actual data.');
      return c.json(
        { error: { message: 'Session data verification failed - CID mismatch', code: 'VALIDATION_ERROR' } },
        400,
        { ...corsHeaders, 'Content-Type': 'application/json' }
      );
    } else {
      console.log('[execute-finalize-action] CID is valid');
    }

    console.log('[execute-finalize-action] Connecting LitNodeClient...');
    await litNodeClient.connect();
    console.log('[execute-finalize-action] Connected to LitNodeClient!');

    // Example AccessControlConditions:
    // Adjust or expand these as needed in your scenario:
    const accessControlConditions: AccessControlConditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: wallet.address,
        },
      },
    ];

    console.log('[execute-finalize-action] Generating session signatures...');
    const sessionSigs = await sessionSigsForDecryptInAction(
      wallet,
      litNodeClient,
      accessControlConditions,
      learnerAddressEncryptHash
    );
    console.log('[execute-finalize-action] Session signatures obtained.');

    console.log('[execute-finalize-action] Executing Lit Action JS...');
    const jsParams = {
      ipfsCid: sessionDataIpfsHash,
      finalizationType: finalizationTypeResolved,
      faultData: faultDataResolved,
      roomId: roomIdResolved,
      accessControlConditions,
      teacherAddressCiphertext,
      teacherAddressEncryptHash,
      learnerAddressCiphertext,
      learnerAddressEncryptHash,
      daiContractAddress,
      relayerIpfsId,
      env,
      rpcChain,
      rpcChainId,
      controllerAddress,
    };
    console.log("jsParams", jsParams);

    const results = await litNodeClient.executeJs({
      ipfsId: FINALIZE_LIT_ACTION_IPFS_CID,
      sessionSigs,
      jsParams,
    });

    // If the action fails or "success" is false, throw:
    if (!results.success) {
      console.error('[execute-finalize-action] Lit Action returned success=false:', results);
      throw new Error('execute-finalize-action failed');
    } else {
      console.log('[execute-finalize-action] Lit Action executed successfully. Results:', results);
    }

    // Disconnect to clean up
    await litNodeClient.disconnect();
    console.log('[execute-finalize-action] Disconnected from LitNodeClient.');

    // The response from the action is apparently stored in results.response
    const actionResp = JSON.parse(results.response || '{}');
    console.log('[execute-finalize-action] Action response parsed:', actionResp);

    // Return a success JSON
    return c.json(
      {
        transactionHash: actionResp.relayedTxHash,
        litActionIpfsHash: results.response.ipfsHash,
        verifiedSessionCID: sessionDataIpfsHash
      },
      200,
      { ...corsHeaders, 'Content-Type': 'application/json' }
    );

  } catch (e: unknown) {
    await litNodeClient.disconnect();
    const error = e as Error & { code?: string };
    console.error('[execute-finalize-action] Error processing request:', error);

    return c.json(
      {
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
        },
      },
      500,
      { ...corsHeaders, 'Content-Type': 'application/json' }
    );
  }
});

/** Handle OPTIONS for CORS Preflight */
app.options('/', (c) => {
  return c.newResponse(null, 204, corsHeaders);
});

/** Helper: fetch raw bytes from IPFS */
async function fetchFromIPFSAsBytes(ipfsHash: string): Promise<Uint8Array> {
  console.log('[execute-finalize-action] Fetching IPFS data for CID:', ipfsHash);
  const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  const rawData = await response.arrayBuffer();
  return new Uint8Array(rawData);
}

/** Compare pinned object to the in-memory data. Logs debugging if mismatch occurs. */
function comparePayloads(provided: PinataPayload, fetchedBytes: Uint8Array): boolean {
  const fetchedObject = JSON.parse(new TextDecoder().decode(fetchedBytes));
  const isSame = JSON.stringify(provided) === JSON.stringify(fetchedObject);
  if (!isSame) {
    console.log('[execute-finalize-action] Provided object:', JSON.stringify(provided, null, 2));
    console.log('[execute-finalize-action] Fetched object:', JSON.stringify(fetchedObject, null, 2));
  }
  return isSame;
}

/** Validate pinned data matches the provided CID */
async function validateIPFSDataBytes(data: Uint8Array, providedCID: string): Promise<boolean> {
  const hash = await sha256.digest(data);
  const calculatedCID = CID.create(1, rawCodec.code, hash);
  const isValid = calculatedCID.toString() === providedCID;
  if (!isValid) {
    console.log('[execute-finalize-action] Provided CID:', providedCID);
    console.log('[execute-finalize-action] Actual CID:', calculatedCID.toString());
  }
  return isValid;
}

/** Validate Pinata Payload structure. */
function validatePinataPayload(payload: any): payload is PinataPayload {
  if (!payload) {
    console.log('[execute-finalize-action] No pinataPayload provided.');
    return false;
  }
  const validScenario = ['fault', 'non_fault'].includes(payload.scenario);
  const validStructure =
    !!payload.teacherData &&
    !!payload.learnerData &&
    validScenario &&
    typeof payload.timestamp === 'number' &&
    typeof payload.roomId === 'string';

  if (!validStructure) {
    console.log('[execute-finalize-action] Pinata payload missing required fields or scenario mismatch.');
  }
  return validStructure;
}

// Use the Hono app with Deno Deploy
Deno.serve(async (req) => {
  try {
    return await app.fetch(req);
  } catch (error: unknown) {
    console.error("[execute-finalize-action] Error in request handler:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

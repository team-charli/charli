///Users/zm/Projects/charli/apps/supabase/functions/test-finalize/index.ts
import { Hono } from 'npm:hono'
import { corsHeaders } from '../_shared/cors.ts';
import * as json from "https://esm.sh/multiformats/codecs/json";
import { sha256 } from "https://esm.sh/multiformats/hashes/sha2";
import { CID } from "https://esm.sh/multiformats/cid";

const PINATA_GATEWAY = "chocolate-deliberate-squirrel-286.mypinata.cloud";

interface EdgeFunctionResponse {
  transactionHash?: string;
  litActionIpfsHash?: string;
  error?: {
    message: string;
    code: string;
  };
}

const app = new Hono()

app.post('/test-finalize', async (c) => {
  try {
    const { sessionDataIpfsHash } = await c.req.json();

    // Fetch and validate the data from IPFS
    const sessionData = await fetchFromIPFS(sessionDataIpfsHash);
    const isValid = await validateIPFSData(sessionData, sessionDataIpfsHash);

    if (!isValid) {
      const response: EdgeFunctionResponse = {
        error: {
          message: 'Session data verification failed - CID mismatch',
          code: 'VALIDATION_ERROR'
        }
      };
      return c.json(response, 400);
    }

    // Return mock success response matching production format
    const response: EdgeFunctionResponse = {
      transactionHash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
      litActionIpfsHash: `Qm${crypto.randomUUID().replace(/-/g, '')}`
    };

    return c.json(response);

  } catch (error) {
    const response: EdgeFunctionResponse = {
      error: {
        message: error.message,
        code: 'UNKNOWN_ERROR'
      }
    };
    return c.json(response, 500);
  }
})

async function validateIPFSData(data: any, providedHash: string): Promise<boolean> {
  const bytes = json.encode(data)
  const hash = await sha256.digest(bytes)
  const calculatedCID = CID.create(1, json.code, hash)
  return calculatedCID.toString() === providedHash
}

async function fetchFromIPFS(ipfsHash: string) {
  const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  return response.json();
}

export default { fetch: app.fetch }
Deno.serve(app.fetch)

///Users/zm/Projects/charli/apps/supabase/functions/test-finalize/index.ts

import { Hono } from 'jsr:@hono/hono'
import { corsHeaders } from '../_shared/cors.ts'
import * as json from 'https://esm.sh/multiformats/codecs/json'
import { sha256 } from 'https://esm.sh/multiformats/hashes/sha2'
import { CID } from 'https://esm.sh/multiformats/cid'
import * as rawCodec from 'https://esm.sh/multiformats/codecs/raw'

const PINATA_GATEWAY = 'chocolate-deliberate-squirrel-286.mypinata.cloud'

// -- Interfaces --
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

interface TestEdgeFunctionResponse {
  reconstructedSessionCID?: string
  workerPinnedSessionCID?: string
  error?: {
    message: string
    code: string
  }
}

// -- Hono App --
const app = new Hono()

app.post('/test-finalize', async (c) => {
  try {
    const { pinataPayload, sessionDataIpfsHash } = await c.req.json()
    console.log('pinataPayload', pinataPayload)
    console.log('sessionDataIpfsHash', sessionDataIpfsHash)

    // 1) Validate the structure of the pinata payload
    if (!validatePinataPayload(pinataPayload)) {
      const response: TestEdgeFunctionResponse = {
        error: {
          message: 'Invalid Pinata payload structure',
          code: 'INVALID_PAYLOAD',
        },
      }
      return c.json(response, 400)
    }

    // 2) Fetch the session data from IPFS (raw bytes)
    const sessionDataBytes = await fetchFromIPFS(sessionDataIpfsHash)

    // 3) Compare the pinned object to the provided payload (parse the bytes)
    if (!comparePayloads(pinataPayload, sessionDataBytes)) {
      const response: TestEdgeFunctionResponse = {
        error: {
          message: 'Pinata payload does not match IPFS data',
          code: 'PAYLOAD_MISMATCH',
        },
      }
      return c.json(response, 400)
    }

    // 4) Validate the data matches its CID
    const isValid = await validateIPFSData(sessionDataBytes, sessionDataIpfsHash)
    if (!isValid) {
      const response: TestEdgeFunctionResponse = {
        error: {
          message: 'Session data verification failed - CID mismatch',
          code: 'VALIDATION_ERROR',
        },
      }
      return c.json(response, 400)
    }

    // 5) Parse the bytes so we can do a final structure check on the object
    const sessionDataObject = JSON.parse(new TextDecoder().decode(sessionDataBytes))
    console.log('Parsed sessionDataObject:', sessionDataObject)

    // 6) Validate the structure of the session data
    if (!validateSessionData(sessionDataObject)) {
      const response: TestEdgeFunctionResponse = {
        error: {
          message: 'Invalid session data structure',
          code: 'INVALID_DATA',
        },
      }
      return c.json(response, 400)
    }

    // 7) Return actual response based on validated data
    const response: TestEdgeFunctionResponse = {
      reconstructedSessionCID: await generateCIDFromSessionData(sessionDataObject),
      workerPinnedSessionCID: sessionDataIpfsHash,
    }
    console.log("response", response);
    return c.json(response)
  } catch (error) {
    const response: TestEdgeFunctionResponse = {
      error: {
        message: error.message,
        code: 'UNKNOWN_ERROR',
      },
    }
    return c.json(response, 500)
  }
})

// ------------------------------------------------------------------
// Fetch raw bytes from IPFS
async function fetchFromIPFS(ipfsHash: string): Promise<Uint8Array> {
  const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`)
  }
  const rawData = await response.arrayBuffer()
  console.log('Raw IPFS bytes:', new Uint8Array(rawData))
  return new Uint8Array(rawData)
}

// Validate that the raw bytes match the provided CID
async function validateIPFSData(data: Uint8Array, providedHash: string): Promise<boolean> {
  // 1) Hash the raw bytes
  const hash = await sha256.digest(data)

  // 2) Create a CID from them using the raw codec
  const calculatedCID = CID.create(1, rawCodec.code, hash)

  // 3) Compare the string form to the providedHash
  if (calculatedCID.toString() !== providedHash) {
    console.log('calculatedCID.toString()', calculatedCID.toString())
    console.log('providedHash', providedHash)
  }
  return calculatedCID.toString() === providedHash
}

// Compare the pinned object to the in-memory payload
function comparePayloads(provided: PinataPayload, fetchedBytes: Uint8Array): boolean {
  const fetchedObject = JSON.parse(new TextDecoder().decode(fetchedBytes))
  return JSON.stringify(provided) === JSON.stringify(fetchedObject)
}

// Basic schema checks for the payload we receive from the caller
function validatePinataPayload(payload: PinataPayload): boolean {
  return !!(
    payload?.teacherData &&
    payload?.learnerData &&
    payload?.scenario &&
    payload?.timestamp &&
    payload?.roomId &&
    validateUserFinalRecord(payload.teacherData) &&
    validateUserFinalRecord(payload.learnerData) &&
    ['fault', 'non_fault'].includes(payload.scenario)
  )
}

// Basic schema checks for the final session data pinned on IPFS
function validateSessionData(data: any): boolean {
  console.log('validateSessionData data', data)
  return !!(
    data?.teacherData &&
    data?.learnerData &&
    data?.scenario &&
    data?.timestamp
  )
}

// Validate a single user record
function validateUserFinalRecord(record: UserFinalRecord): boolean {
  return !!(
    ['teacher', 'learner'].includes(record.role) &&
    typeof record.hashedTeacherAddress === 'string' &&
    typeof record.hashedLearnerAddress === 'string' &&
    typeof record.sessionDuration === 'number' &&
    typeof record.sessionSuccess === 'boolean' &&
    typeof record.sessionComplete === 'boolean'
  )
}

// Generate a deterministic transaction hash based on the session data
async function generateCIDFromSessionData(data: any): Promise<string> {
  // 1) Encode your final session data as JSON bytes
  const rawData = new TextEncoder().encode(JSON.stringify(data));

  // 2) sha256.digest
  const hash = await sha256.digest(rawData);

  // 3) Create a CIDv1 with the raw codec
  const cid = CID.create(1, rawCodec.code, hash);

  // 4) Return base58-encoded CID
  return cid.toString(); // e.g. "bafkreicls2dyg..."
}

// Export
export default { fetch: app.fetch }
Deno.serve(app.fetch)

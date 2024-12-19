// validate-data-execute-finalize-action.test.ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { CID } from "https://esm.sh/multiformats@10.0.3/cid";
import * as json from "https://esm.sh/multiformats@10.0.3/codecs/json";
import { sha256 } from "https://esm.sh/multiformats@10.0.3/hashes/sha2";

// For Pinata API calls
// validate-data-execute-finalize-action.test.ts
import { load } from "dotenv";

// Load test environment variables before tests
const env = await load({
  envPath: ".env.test",
  examplePath: ".env.test.example",
  export: true,
});

const PINATA_API_KEY = Deno.env.get("PINATA_API_KEY");
const PINATA_SECRET_KEY = Deno.env.get("PINATA_SECRET_KEY");

async function validateIPFSData(data: any, providedHash: string): Promise<boolean> {
  const bytes = json.encode(data)
  const hash = await sha256.digest(bytes)
  const calculatedCID = CID.create(1, json.code, hash)
  return calculatedCID.toString() === providedHash
}

async function pinJSONToIPFS(jsonData: any) {
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': PINATA_API_KEY!,
      'pinata_secret_api_key': PINATA_SECRET_KEY!
    },
    body: JSON.stringify({ pinataContent: jsonData })
  });

  if (!response.ok) {
    throw new Error(`Failed to pin to IPFS: ${response.statusText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

async function fetchFromIPFS(ipfsHash: string) {
  const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  return response.json();
}

const sampleSessionData = {
  teacherData: {
    address: "0x123",
    sessionSuccess: true,
    faultType: null,
    sessionComplete: true
  },
  learnerData: {
    address: "0x456",
    sessionSuccess: true,
    faultType: null,
    sessionComplete: true
  },
  scenario: "non_fault",
  timestamp: 1703001600000  // Fixed timestamp for reproducible tests
};

Deno.test("validateIPFSData - should validate data pinned to IPFS", async () => {
  // First pin the data and get its CID
  const ipfsHash = await pinJSONToIPFS(sampleSessionData);
  console.log("Pinned data with hash:", ipfsHash);

  // Fetch the data back from IPFS
  const retrievedData = await fetchFromIPFS(ipfsHash);
  console.log("Retrieved data:", retrievedData);

  // Validate the data matches its CID
  const isValid = await validateIPFSData(retrievedData, ipfsHash);
  assertEquals(isValid, true);
});

Deno.test("validateIPFSData - should reject modified data against pinned CID", async () => {
  // First pin the original data
  const ipfsHash = await pinJSONToIPFS(sampleSessionData);

  // Create modified data
  const modifiedData = {
    ...sampleSessionData,
    timestamp: 1703001600001  // Changed timestamp
  };

  // Validate the modified data against original CID
  const isValid = await validateIPFSData(modifiedData, ipfsHash);
  assertEquals(isValid, false);
});

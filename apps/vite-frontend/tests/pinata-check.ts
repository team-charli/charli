// pinata-check.ts
const pinataApiKey = Bun.env.PINATA_API_KEY;
const pinataSecretApiKey = Bun.env.PINATA_SECRET_API_KEY;

if (!pinataApiKey || !pinataSecretApiKey) {
  console.error("Missing Pinata credentials in environment. Check Bun.env.PINATA_API_KEY and Bun.env.PINATA_SECRET_API_KEY.");
  process.exit(1);
}

const pinataUrl = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

async function run() {
  console.log("Attempting to pin small JSON data to Pinata...");

  // The data you want to pin
  const testData = {
    timestamp: Date.now(),
    message: "Hello from Bun/Pinata test"
  };

  try {
    const res = await fetch(pinataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretApiKey
      },
      body: JSON.stringify({
        pinataContent: testData,
        pinataOptions: { cidVersion: 1 }
      })
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      // e.g. 403 if usage limit, or 400 if bad request
      const errorText = await res.text();
      console.error("Error response from Pinata:", errorText);
      process.exit(1);
    }

    const json = await res.json();
    console.log("Success. Pinata response:", json);
    console.log("Pinned IPFS hash:", json.IpfsHash);

  } catch (err) {
    console.error("Failed to pin data:", err);
    process.exit(1);
  }
}

run();


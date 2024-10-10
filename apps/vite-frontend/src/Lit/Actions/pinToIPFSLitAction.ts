const pinToIPFSLitAction = async () => {

  try {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretApiKey
      },
      body: JSON.stringify({
        pinataContent: linkData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    Lit.Actions.setResponse({ response: result.IpfsHash });
  } catch (error) {
    console.error('Error pinning to IPFS:', error);
    Lit.Actions.setResponse({ response: JSON.stringify({ error: error.message }) });
  }
};

pinToIPFSLitAction();

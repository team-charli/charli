// app.test.tsx
import { isSessionSigsExpired } from '../src/utils/app';

const sessionSigsData = {
  "https://cayenne.litgateway.com:7371": {
    "sig": "ea4a162d593533e4c6bd796907aaeb53136b71af4c00700c77f4f62dd5806f61e8f6fead0d42fec5532744e59dc4170fc96eb9fda6291598ee348f67e68d4002",
    "derivedVia": "litSessionSignViaNacl",
    "signedMessage": "{\"sessionKey\":\"98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823\",\"resourceAbilityRequests\":[{\"resource\":{\"resource\":\"*\",\"resourcePrefix\":\"lit-litaction\"},\"ability\":\"pkp-signing\"}],\"capabilities\":[{\"sig\":\"0x264d816d9c2517e7fbec29d5927f3bb2637e7ba9328fda6076d1d5273f26064970469628c22fc7446c5d9087b53c3c2259e0e21a040c9fb0e5061c7bcb0272431c\",\"derivedVia\":\"web3.eth.personal.sign via Lit PKP\",\"signedMessage\":\"localhost:3000 wants you to sign in with your Ethereum account:\\n0x727e5124dab416C2d2934A1eF662674fD36C545d\\n\\nLit Protocol PKP session signature I further authorize the stated URI to perform the following actions on my behalf:\\n\\nURI: lit:session:98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823\\nVersion: 1\\nChain ID: 1\\nNonce: 0xf9a12bfc2267f3708d6f557684941b89069d79a6518304397ecfa200437d2789\\nIssued At: 2024-04-27T02:13:47Z\\nExpiration Time: 2024-04-28T02:14:06.670Z\\nResources:\\n- urn:recap:eyJhdHQiOnt9LCJwcmYiOltdfQ\",\"address\":\"0x727e5124dab416C2d2934A1eF662674fD36C545d\"}],\"issuedAt\":\"2024-04-27T02:14:08.041Z\",\"expiration\":\"2024-04-27T02:19:08.041Z\",\"nodeAddress\":\"https://cayenne.litgateway.com:7371\"}",
    "address": "98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823",
    "algo": "ed25519"
  },
  "https://cayenne.litgateway.com:7372": {
    "sig": "a5ac49a88fd31af4a49fd138f5cf861418ad0ef6da3747be7507df484a0b12481c689af2a2495662d505828eee64f276918f07c874284384557468e5e2b14306",
    "derivedVia": "litSessionSignViaNacl",
    "signedMessage": "{\"sessionKey\":\"98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823\",\"resourceAbilityRequests\":[{\"resource\":{\"resource\":\"*\",\"resourcePrefix\":\"lit-litaction\"},\"ability\":\"pkp-signing\"}],\"capabilities\":[{\"sig\":\"0x264d816d9c2517e7fbec29d5927f3bb2637e7ba9328fda6076d1d5273f26064970469628c22fc7446c5d9087b53c3c2259e0e21a040c9fb0e5061c7bcb0272431c\",\"derivedVia\":\"web3.eth.personal.sign via Lit PKP\",\"signedMessage\":\"localhost:3000 wants you to sign in with your Ethereum account:\\n0x727e5124dab416C2d2934A1eF662674fD36C545d\\n\\nLit Protocol PKP session signature I further authorize the stated URI to perform the following actions on my behalf:\\n\\nURI: lit:session:98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823\\nVersion: 1\\nChain ID: 1\\nNonce: 0xf9a12bfc2267f3708d6f557684941b89069d79a6518304397ecfa200437d2789\\nIssued At: 2024-04-27T02:13:47Z\\nExpiration Time: 2024-04-28T02:14:06.670Z\\nResources:\\n- urn:recap:eyJhdHQiOnt9LCJwcmYiOltdfQ\",\"address\":\"0x727e5124dab416C2d2934A1eF662674fD36C545d\"}],\"issuedAt\":\"2024-04-27T02:14:08.041Z\",\"expiration\":\"2024-04-27T02:19:08.041Z\",\"nodeAddress\":\"https://cayenne.litgateway.com:7372\"}",
    "address": "98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823",
    "algo": "ed25519"
  },
  "https://cayenne.litgateway.com:7370": {
    "sig": "201e646efa5f8aefa92f4ffb173047ff3b4341fa888f722ce79fa6a5a8bbea5f6c07ed22bd762205d4cd092843d9e8ca8aa16907cd3f3c9b8a7fbcb91853ab04",
    "derivedVia": "litSessionSignViaNacl",
    "signedMessage": "{\"sessionKey\":\"98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823\",\"resourceAbilityRequests\":[{\"resource\":{\"resource\":\"*\",\"resourcePrefix\":\"lit-litaction\"},\"ability\":\"pkp-signing\"}],\"capabilities\":[{\"sig\":\"0x264d816d9c2517e7fbec29d5927f3bb2637e7ba9328fda6076d1d5273f26064970469628c22fc7446c5d9087b53c3c2259e0e21a040c9fb0e5061c7bcb0272431c\",\"derivedVia\":\"web3.eth.personal.sign via Lit PKP\",\"signedMessage\":\"localhost:3000 wants you to sign in with your Ethereum account:\\n0x727e5124dab416C2d2934A1eF662674fD36C545d\\n\\nLit Protocol PKP session signature I further authorize the stated URI to perform the following actions on my behalf:\\n\\nURI: lit:session:98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823\\nVersion: 1\\nChain ID: 1\\nNonce: 0xf9a12bfc2267f3708d6f557684941b89069d79a6518304397ecfa200437d2789\\nIssued At: 2024-04-27T02:13:47Z\\nExpiration Time: 2024-04-28T02:14:06.670Z\\nResources:\\n- urn:recap:eyJhdHQiOnt9LCJwcmYiOltdfQ\",\"address\":\"0x727e5124dab416C2d2934A1eF662674fD36C545d\"}],\"issuedAt\":\"2024-04-27T02:14:08.041Z\",\"expiration\":\"2024-04-27T02:19:08.041Z\",\"nodeAddress\":\"https://cayenne.litgateway.com:7370\"}",
    "address": "98389b582eb0e77610ef349d476dff4b27d9a68f2dd5666ec4053d779b742823",
    "algo": "ed25519"
  }
};

describe('isSessionSigsExpired', () => {
  it('should return false if no session signatures have expired', () => {
    expect(isSessionSigsExpired(sessionSigsData)).toBe(false);
  });

  it('should return true if any session signature has expired', () => {
    const expiredSessionSigsData = {
      ...sessionSigsData,
      "https://cayenne.litgateway.com:7370": {
        ...sessionSigsData["https://cayenne.litgateway.com:7370"],
        signedMessage: JSON.stringify({
          ...JSON.parse(sessionSigsData["https://cayenne.litgateway.com:7370"].signedMessage),
          expiration: "2024-04-26T02:19:08.041Z" // Expired date
        })
      }
    };
    expect(isSessionSigsExpired(expiredSessionSigsData)).toBe(true);
  });
});

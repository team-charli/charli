import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { ethers } from "ethers";

// Some helper that creates the resource string from ACC + dataToEncryptHash
import { LitAccessControlConditionResource, LitActionResource, createSiweMessageWithRecaps, generateAuthSig, LitAbility } from "@lit-protocol/auth-helpers";
import { AuthCallbackParams } from "@lit-protocol/types";

export async function genSessionForAction({
  client,
  wallet,
  acc,
  dataHash,
  ipfsId,
}: {
    client: LitNodeClient,
    wallet: ethers.Wallet,
    acc: any,
    dataHash: string,
    ipfsId: string,
  }) {
  const resourceString = await LitAccessControlConditionResource.generateResourceString(acc, dataHash);

  // or you can simply allow the user to run *any* lit action with `new LitActionResource("*")`

  const resourceAbilityRequests = [
    {
      resource: new LitActionResource(`*`), // or "ipfs://Qmdpu1cdQ..."
      ability: LitAbility.LitActionExecution,
    },
    {
      resource: new LitAccessControlConditionResource(resourceString),
      ability: LitAbility.AccessControlConditionDecryption,
    },
  ];

  const sessionSigs = await client.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests,
    authNeededCallback: async (params: AuthCallbackParams) => {
      const { uri, expiration, resourceAbilityRequests } = params;

      if (!uri || !expiration || !resourceAbilityRequests) {
        throw new Error("Missing required param in SIWE callback");
      }

      const blockHash = await client.getLatestBlockhash();

      // Note: createSiweMessageWithRecaps expects `resources: LitResourceAbilityRequest[]`
      // so we pass resourceAbilityRequests directly
      const siweMsg = await createSiweMessageWithRecaps({
        walletAddress: wallet.address,
        nonce: blockHash,
        litNodeClient: client,
        resources: resourceAbilityRequests,
        expiration,
        uri,
      });

      const authSig = await generateAuthSig({
        signer: wallet,
        toSign: siweMsg,
        address: wallet.address,
      });

      return authSig;
    },
  });

  return sessionSigs;
}


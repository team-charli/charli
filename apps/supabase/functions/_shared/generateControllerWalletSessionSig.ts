import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { AuthCallbackParams, LitResourceAbilityRequest} from "https://esm.sh/@lit-protocol/types";
import {
  LitActionResource,
  createSiweMessageWithRecaps,
  LitAbility,
  LitAccessControlConditionResource,
  generateAuthSig
} from "https://esm.sh/@lit-protocol/auth-helpers";
import { ethers, HDNodeWallet } from "https://esm.sh/ethers@5.7.0";

const ONE_WEEK_FROM_NOW = new Date(
  Date.now() + 1000 * 60 * 60 * 24 * 7
).toISOString();

const genAuthSig = async (
  wallet: HDNodeWallet,
  client: LitNodeClientNodeJs,
  uri: string,
  resources: LitResourceAbilityRequest[]
) => {
  let blockHash = await client.getLatestBlockhash();
  const message = await createSiweMessageWithRecaps({
    walletAddress: wallet.address,
    nonce: blockHash,
    litNodeClient: client,
    resources,
    expiration: ONE_WEEK_FROM_NOW,
    uri
  });
  const authSig = await generateAuthSig({
    signer: wallet,
    toSign: message,
    address: wallet.address
  });
  return authSig;
};

const genSession = async (
  wallet: ethers.Wallet,
  client: LitNodeClientNodeJs,
  resources: LitResourceAbilityRequest[]
) => {
  let sessionSigs = await client.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: resources,
    authNeededCallback: async (params: AuthCallbackParams) => {
      console.log("resourceAbilityRequests:", params.resources);

      if (!params.expiration) throw new Error("expiration is required");
      if (!params.resources) throw new Error("resourceAbilityRequests is required");
      if (!params.uri) throw new Error("uri is required");

      // generate the authSig for the inner signature of the session
      const authSig = await genAuthSig(wallet, client, params.uri, params.resourceAbilityRequests ?? []);
      return authSig;
    }
  });

  return sessionSigs;
};

export const sessionSigsForDecryptInAction = async (
  wallet: ethers.Wallet,
  client: LitNodeClient,
  accessControlConditions: any,
  dataToEncryptHash: string,
) => {
  const accsResourceString =
    await LitAccessControlConditionResource.generateResourceString(accessControlConditions, dataToEncryptHash);
  console.log("accsResourceString ", accsResourceString)
  const sessionForDecryption = await genSession(wallet, client, [
    {
      resource: new LitActionResource('*'),
      ability: LitAbility.LitActionExecution,
    },
    {
      resource: new LitAccessControlConditionResource(accsResourceString),
      ability: LitAbility.AccessControlConditionDecryption,
    }
  ]);

  return sessionForDecryption;
};


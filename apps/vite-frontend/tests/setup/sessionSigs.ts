import { LitNodeClient } from "@lit-protocol/lit-node-client";
import {
  LitAbility,
  LitAccessControlConditionResource,
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource
} from "@lit-protocol/auth-helpers";
import * as ethers from "ethers";
import { AccessControlConditions, LitResourceAbilityRequest, AuthCallbackParams } from "@lit-protocol/types";

const ONE_WEEK_FROM_NOW = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

const convertToLitResourceAbilityRequest = (resource: string): LitResourceAbilityRequest => {
  return {
    resource: new LitActionResource(resource),
    ability: LitAbility.LitActionExecution,
  };
};

const genAuthSig = async (
  ethersSigner: ethers.HDNodeWallet,
  litNodeClient: LitNodeClient,
  params: AuthCallbackParams,
  resourceAbilityRequests: LitResourceAbilityRequest[]

) => {
  if (!params.uri) {
    throw new Error("URI is required for SIWE message");
  }

  const resources: LitResourceAbilityRequest[] = params.resources
    ? params.resources.map(convertToLitResourceAbilityRequest)
    : [];

  const message = await createSiweMessageWithRecaps({
    walletAddress: await ethersSigner.getAddress(),
    nonce: params.nonce,
    litNodeClient,
    resources: resourceAbilityRequests,
    expiration: params.expiration || ONE_WEEK_FROM_NOW,
    uri: params.uri
  });
  return await generateAuthSig({
    signer: ethersSigner,
    toSign: message,
    address: await ethersSigner.getAddress()
  });
};

export const getSessionSigsViaAuthSig = async (
  ethersSigner: ethers.Wallet,
  litNodeClient: LitNodeClient,
  dataToEncryptHash?: string,
  acc?: AccessControlConditions,
) => {
  try {
    let resourceAbilityRequests: LitResourceAbilityRequest[];
    if (acc?.length && dataToEncryptHash?.length) {
    const accsResourceString = await LitAccessControlConditionResource.generateResourceString(acc, dataToEncryptHash);
    resourceAbilityRequests  = [
      {
        resource: new LitActionResource("*"),
        ability: LitAbility.LitActionExecution,
      },
      {
        resource: new LitAccessControlConditionResource(accsResourceString),
        ability: LitAbility.AccessControlConditionDecryption,
      }
    ];
    } else {
      resourceAbilityRequests = [
      {
        resource: new LitActionResource("*"),
        ability: LitAbility.LitActionExecution,
      },

      ]
    }
    console.log("Generated resource ability requests:", resourceAbilityRequests);

    const sessionSignatures = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      expiration: ONE_WEEK_FROM_NOW,
      resourceAbilityRequests,
      authNeededCallback: async (params: AuthCallbackParams) => {
        if (!params.expiration || !params.uri) {
          throw new Error("Missing required parameters for auth callback");
        }
        return await genAuthSig(ethersSigner, litNodeClient, params, resourceAbilityRequests);
      },
    });

    return sessionSignatures;
  } catch (error) {
    console.error("Error in getSessionSigsViaAuthSig:", error);
    throw error;
  }
};

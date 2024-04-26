import * as LitJsSdk from "@lit-protocol/lit-node-client";
import {
  AuthCallbackParams,
  AuthMethod,
  AuthSig,
  GetSessionSigsProps,
  IRelayPKP,
  SessionSig,
  SessionSigs,
} from '@lit-protocol/types';
// import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import {
  GoogleProvider,
  DiscordProvider,
  EthWalletProvider,
  WebAuthnProvider,
  LitAuthClient,
} from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { AuthMethodType, ProviderType } from '@lit-protocol/constants';
import {isDefined} from './app'
const stytch_id = process.env.NEXT_PUBLIC_STYTCH_PROJECT_ID
// export const DOMAIN = process.env.NEXT_PUBLIC_PUBLIC_PROD_URL || 'localhost';
// export const PORT = `${window.location.port}`;
// export const ORIGIN =
//   process.env.NEXT_PUBLIC_PUBLIC_ENV === 'production'
//     ? `https://${DOMAIN}`
//     : `http://${DOMAIN}:${PORT}`;

export const litNodeClient: LitNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork: 'cayenne',
  debug: true,
});

export const litAuthClient: LitAuthClient = new LitAuthClient({
  litRelayConfig: {
    relayApiKey: "E02B0102-DFF4-67E9-3385-5C71096D7CA0_charli",
  },
  litNodeClient,
});

/**
 * Validate provider
 */
export function isSocialLoginSupported(provider: string): boolean {
  return ['google', 'discord'].includes(provider);
}

export async function signInWithGoogle(redirectUri: string): Promise<void> {
  console.log('signInWithGoogle fired')
  const googleProvider = litAuthClient.initProvider<GoogleProvider>(
    ProviderType.Google,
    { redirectUri }
  );
  await googleProvider.signIn();
}

export async function authenticateWithGoogle(
  redirectUri: string
): Promise<AuthMethod | undefined> {
  const googleProvider = litAuthClient.initProvider<GoogleProvider>(
    ProviderType.Google,
    { redirectUri }
  );
  const authMethod = await googleProvider.authenticate();
  return authMethod;
}

//TODO: Implement redirectUri with Google Oauth project
export async function signInWithDiscord(redirectUri: string): Promise<void> {
  const discordProvider = litAuthClient.initProvider<DiscordProvider>(
    ProviderType.Discord,
    { redirectUri }
  );
  await discordProvider.signIn();
}

//TODO: Implement redirectUri with Discord Oauth project
export async function authenticateWithDiscord(
  redirectUri: string
): Promise<AuthMethod | undefined> {

  const discordProvider = litAuthClient.initProvider<DiscordProvider>(
    ProviderType.Discord,
    { redirectUri }
  );
  const authMethod = await discordProvider.authenticate();
  return authMethod;
}

export async function getSessionSigs({
  pkpPublicKey,
  authMethod,
}: {
    pkpPublicKey: string;
    authMethod: AuthMethod;
  }): Promise<SessionSigs> {
  try {
    const sessionKeyPair = litNodeClient.getSessionKey();
    const authNeededCallback = async (params: any ) => {
      const response = await litNodeClient.signSessionKey({
        sessionKey: sessionKeyPair,
        statement: params.statement,
        authMethods: [authMethod],
        pkpPublicKey: pkpPublicKey,
        expiration: params.expiration,
        resources: params.resources,
        chainId: 1,
      });
      return response.authSig;
    };

    const resourceAbilities = [
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.PKPSigning,
      },
    ];

    let sessionSigs: SessionSigs;

    try {
      sessionSigs = await litNodeClient.getSessionSigs({
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        resourceAbilityRequests: resourceAbilities,
        sessionKey: sessionKeyPair,
        authNeededCallback,
      });
      // If the operation is successful, you can use sessionSigs as needed
      return sessionSigs
    } catch (e) {
      // Handle the error
      console.error("An error occurred while getting session signatures:", e);
      throw e
      // Depending on your application's needs, you might choose to rethrow the error,
      // return a default value, or perform some other error handling logic here.
    }

    // Continue with your logic, potentially using sessionSigs if it was successfully assigned

  } catch(e) {
    const error = e as Error;
    console.error("litNodeClient.getSessionSigs(): stack", error.stack);
    console.error("litNodeClient.getSessionSigs(): error", error)
    throw error
  }
  // return sessionSigs


  // const provider = getProviderByAuthMethod(authMethod);
  // console.log({provider});
  // if (provider) {
  //   const sessionSigs = await provider.getSessionSigs({
  //     pkpPublicKey,
  //     authMethod,
  //     sessionSigsParams,
  //   });
  //   return sessionSigs;
  // } else {
  //   throw new Error(
  //     `Provider not found for auth method type ${authMethod.authMethodType}`
  //   );
  // }
}

export async function updateSessionSigs(
  params: GetSessionSigsProps
): Promise<SessionSigs> {
  const sessionSigs = await litNodeClient.getSessionSigs(params);
  return sessionSigs;
}

export async function getSessionKeyPair() {
  return litNodeClient.getSessionKey()
}

/**
 * Fetch PKPs associated with given auth method
 */
export async function getPKPs(authMethod: AuthMethod): Promise<IRelayPKP[]> {
  const provider = getProviderByAuthMethod(authMethod);
  if (!isDefined(provider)) throw new Error('provider not defined')
  const allPKPs = await provider.fetchPKPsThroughRelayer(authMethod);
  return allPKPs;
}

/**
 * Mint a new PKP for current auth method
 */
export async function mintPKP(authMethod: AuthMethod): Promise<IRelayPKP> {
  const provider = getProviderByAuthMethod(authMethod);

  let txHash: string;

  if (authMethod.authMethodType === AuthMethodType.WebAuthn) {
    // Register new WebAuthn credential
    const options = await (provider as WebAuthnProvider).register();

    // Verify registration and mint PKP through relay server
    txHash = await (
      provider as WebAuthnProvider
    ).verifyAndMintPKPThroughRelayer(options);
  } else {
    // Mint PKP through relay server
    const options = {
      permittedAuthMethodScopes: [[1]],
    };

    if (!isDefined(provider)) throw new Error('provider not defined')
    txHash = await provider.mintPKPThroughRelayer(authMethod, options);
  }

  if (!isDefined(provider)) throw new Error('provider not defined')
  const response = await provider.relay.pollRequestUntilTerminalState(txHash);
  if (response.status !== 'Succeeded') {
    throw new Error('Minting failed');
  }

  if (isDefined(response.pkpTokenId) && isDefined(response.pkpPublicKey) && isDefined(response.pkpEthAddress)) {
    const newPKP: IRelayPKP = {
      tokenId: response.pkpTokenId,
      publicKey: response.pkpPublicKey,
      ethAddress: response.pkpEthAddress,
    };
    return newPKP;
  } else {
    throw new Error('Response properties are not defined');
  }
}

/**
 * Get provider for given auth method
 */
export function getProviderByAuthMethod(authMethod: AuthMethod) {
  switch (authMethod.authMethodType) {
    case AuthMethodType.GoogleJwt:
      return litAuthClient.getProvider(ProviderType.Google);
    case AuthMethodType.Discord:
      return litAuthClient.getProvider(ProviderType.Discord);
    case AuthMethodType.EthWallet:
      return litAuthClient.getProvider(ProviderType.EthWallet);
    case AuthMethodType.WebAuthn:
      return litAuthClient.getProvider(ProviderType.WebAuthn);
    case AuthMethodType.StytchOtp:
      return litAuthClient.getProvider(ProviderType.StytchOtp);
    case AuthMethodType.StytchOtp:
      return litAuthClient.getProvider(ProviderType.StytchOtp);
    default:
      return;
  }
}


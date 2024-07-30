import {
  AuthMethod,
  IRelayPKP,
} from '@lit-protocol/types';
import {
  GoogleProvider,
  DiscordProvider,
  WebAuthnProvider,
} from '@lit-protocol/lit-auth-client';
import { litAuthClient } from './litClients';
import { base64url } from 'jose';
import crypto from 'crypto';

import { AuthMethodType, ProviderType } from '@lit-protocol/constants';
import {isDefined} from './app'
import { encode } from '@lit-protocol/lit-auth-client/src/lib/utils';
export const DOMAIN = process.env.NEXT_PUBLIC_PUBLIC_PROD_URL || 'localhost';
export const PORT = 3000;
export const ORIGIN = process.env.NEXT_PUBLIC_PUBLIC_ENV === 'production'
  ? `https://${DOMAIN}`
  : `http://${DOMAIN}:${PORT}`;

export function isSocialLoginSupported(provider: string): boolean {
  return ['google', 'discord'].includes(provider);
}

// export async function signInWithGoogle(redirectUri: string): Promise<void> {
//   console.log('signInWithGoogle fired')
//   const googleProvider = litAuthClient.initProvider<GoogleProvider>(
//     ProviderType.Google,
//     { redirectUri, clientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID }
//   );

//   await googleProvider.signIn();
// }

const LIT_LOGIN_GATEWAY = 'https://accounts.google.com/o/oauth2/v2/auth';

const GOOGLE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function signInWithGoogle(redirectUri: string): Promise<void> {
  console.log("call signInWithGoogle");

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID!;
  const state = await setStateParam();
  const nonce = generateNonce();

  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_nonce', nonce);

  const authParams = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token token',
    response_mode: 'query',
    scope: 'openid email profile',
    state: state,
    nonce: nonce,
    prompt: 'select_account',
    provider: 'google',
  };

  const loginUrl = `${GOOGLE_OAUTH_ENDPOINT}?${createQueryParams(authParams)}`;

  window.location.assign(loginUrl);
}

async function setStateParam(): Promise<string> {
  const state = Math.random().toString(36).substring(2, 17);
  sessionStorage.setItem('oauth_state', encode(state));
  return state;
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

function createQueryParams(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export async function authenticateWithGoogle(
  redirectUri: string
): Promise<AuthMethod | undefined> {
  const googleProvider = litAuthClient.initProvider<GoogleProvider>(
    ProviderType.Google,
    { redirectUri, clientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID }
  );
  const authMethod = await googleProvider.authenticate();
  return authMethod;
}

export async function signInWithDiscord(redirectUri: string): Promise<void> {
  const discordProvider = litAuthClient.initProvider<DiscordProvider>(
    ProviderType.Discord,
    { redirectUri }
  );
  await discordProvider.signIn();
}

export async function authenticateWithDiscord(redirectUri: string
): Promise<AuthMethod | undefined> {

  const discordProvider = litAuthClient.initProvider<DiscordProvider>(
    ProviderType.Discord,
    { redirectUri }
  );
  const authMethod = await discordProvider.authenticate();
  return authMethod;
}

/** Fetch PKPs associated with given auth method */
export async function getPKPs(authMethod: AuthMethod): Promise<IRelayPKP[]> {
  console.log('authMethod', authMethod)
  const provider = getProviderByAuthMethod(authMethod);

  if (!isDefined(provider)) throw new Error('provider not defined')
  console.log('authMethod.accessToken', authMethod.accessToken)
  const allPKPs = await provider.fetchPKPsThroughRelayer(authMethod);
  return allPKPs;
}

/** Mint a new PKP for current auth method */
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

/** Get provider for given auth method */
export function getProviderByAuthMethod(authMethod: AuthMethod) {
  console.log('authMethod.authMethodType', authMethod.authMethodType)
  switch (authMethod.authMethodType) {
    case AuthMethodType.Google:
      return litAuthClient.getProvider(ProviderType.Google);
    case AuthMethodType.Discord:
      return litAuthClient.getProvider(ProviderType.Discord);
    default:
      return;
  }
}

export function getAuthMethodByProvider(provider: string): AuthMethodType {
  switch (provider.toLowerCase()) {
    case 'google':
      return AuthMethodType.Google;
    case 'discord':
      return AuthMethodType.Discord;
    // Add more cases as needed
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}




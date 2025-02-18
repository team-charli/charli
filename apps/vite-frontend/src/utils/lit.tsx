///Users/zm/Projects/charli/apps/vite-frontend/src/utils/lit.tsx
import {
  AuthMethod,
  IRelayPKP,
} from '@lit-protocol/types';
import {
  DiscordProvider,
} from '@lit-protocol/lit-auth-client';
import { litAuthClient } from './litClients';

import { AuthMethodType, ProviderType } from '@lit-protocol/constants';
import {isDefined} from './app'
import { encode } from '@lit-protocol/lit-auth-client/src/lib/utils';
import { UnifiedAuth } from '@/types/types';
export const DOMAIN = import.meta.env.VITE_PUBLIC_PROD_URL || 'localhost';
export const PORT = 3000;
export const ORIGIN = import.meta.env.VITE_PUBLIC_ENV === 'production'
  ? `https://${DOMAIN}`
  : `http://${DOMAIN}:${PORT}`;

export function isSocialLoginSupported(provider: string): boolean {
  return ['google', 'discord'].includes(provider);
}

// export async function signInWithGoogle(redirectUri: string): Promise<void> {
//   console.log('signInWithGoogle fired')
//   const googleProvider = litAuthClient.initProvider<GoogleProvider>(
//     ProviderType.Google,
//     { redirectUri, clientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID }
//   );

//   await googleProvider.signIn();
// }


const GOOGLE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function signInWithGoogle(redirectUri: string): Promise<void> {
  console.log("call signInWithGoogle");

  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID!;
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

// export async function authenticateWithGoogle(
//   redirectUri: string
// ): Promise<AuthMethod | undefined> {
//   const googleProvider = litAuthClient.initProvider<GoogleProvider>(
//     ProviderType.Google,
//     { redirectUri, clientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID }
//   );
//   const authMethod = await googleProvider.authenticate();
//   return authMethod;
// }

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
  const provider = getProviderByAuthMethod(authMethod);

  if (!isDefined(provider)) throw new Error('provider not defined')
  const allPKPs = await provider.fetchPKPsThroughRelayer(authMethod);
  return allPKPs;
}

/** Mint a new PKP for current auth method */
export async function mintPKP(authMethod: AuthMethod): Promise<IRelayPKP> {
  const provider = getProviderByAuthMethod(authMethod);
  let txHash: string;
    // Mint PKP through relay server
    const options = {
      permittedAuthMethodScopes: [[1]],
    };

    if (!isDefined(provider)) throw new Error('provider not defined')
    txHash = await provider.mintPKPThroughRelayer(authMethod, options);

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
  switch (authMethod.authMethodType) {
    case AuthMethodType.GoogleJwt:
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
      return AuthMethodType.GoogleJwt;
    case 'discord':
      return AuthMethodType.Discord;
    // Add more cases as needed
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}



/**
 * Convert your UnifiedAuth to the simple AuthMethod object
 * that Lit expects. Lit requires { authMethodType, accessToken }
 */
export function toLitAuthMethod(u: UnifiedAuth): AuthMethod {
  return {
    authMethodType: u.authMethodType,
    // For Google, you said you put the real ID token in `litAccessToken`.
    // If that might be null, provide a fallback string:
    accessToken: u.litAccessToken ?? '',
  };
}


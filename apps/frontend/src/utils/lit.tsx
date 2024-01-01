import { SiweMessage } from 'siwe';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import {
  AuthCallbackParams,
  AuthMethod,
  AuthSig,
  GetSessionSigsProps,
  IRelayPKP,
  SessionSigs,
} from '@lit-protocol/types';
import {
  GoogleProvider,
  EthWalletProvider,
  WebAuthnProvider,
  LitAuthClient,
} from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { AuthMethodType, ProviderType } from '@lit-protocol/constants';
import {isDefined} from './app'
const stytch_id = import.meta.env.VITE_STYTCH_PROJECT_ID
export const DOMAIN = import.meta.env.VITE_PUBLIC_PROD_URL || 'localhost';
export const PORT = `${window.location.port}`;
export const ORIGIN =
  import.meta.env.VITE_PUBLIC_ENV === 'production'
    ? `https://${DOMAIN}`
    : `http://${DOMAIN}:${PORT}`;

export const litNodeClient: LitNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork: 'cayenne',
  debug: true,
});

export const litAuthClient: LitAuthClient = new LitAuthClient({
  litRelayConfig: {
    // relayUrl: 'http://localhost:3001',
    relayApiKey: import.meta.env.VITE_LIT_RELAY_API_KEY,
  },

  litOtpConfig: {
    baseUrl: 'https://auth-api.litgateway.com',
    port: '443',
    startRoute: '/api/otp/start',
    checkRoute: '/api/otp/check',
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

export async function getSessionSigs({
  // authSig
  pkpPublicKey,
  authMethod,
  sessionSigsParams,
}: {
  pkpPublicKey: string;
  authMethod: AuthMethod;
  // authSig: AuthSig;
  sessionSigsParams: GetSessionSigsProps;
}): Promise<SessionSigs> {
  // Create a new ethers.js Wallet instance
  // const authMethods = [authMethod]
  const pkpWallet = new PKPEthersWallet({
    controllerAuthMethods: [authMethod],
    // controllerAuthSig: authSig,
    pkpPubKey: pkpPublicKey,
  });
  await pkpWallet.init();
  console.log("pkpWallet address", pkpWallet?.address )

  // Instantiate a LitNodeClient
  await litNodeClient.connect();
  let nonce = litNodeClient.getLatestBlockhash();

const authNeededCallback = async (params: AuthCallbackParams): Promise<AuthSig> => {
  const { chain, resources = [], expiration, uri } = params;
  const domain = "localhost:4200";

  try {
    const message = new SiweMessage({
      domain,
      address: String(pkpWallet.address),
      statement: "Sign a session key to use with Lit Protocol",
      uri,
      version: "1",
      chainId: 1,
      expirationTime: expiration,
      resources,
      nonce: nonce ?? undefined,
    });

    const toSign = message.prepareMessage();
    const signature = await pkpWallet.signMessage(toSign);

    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: toSign,
      address: pkpWallet.address,
    };
  } catch (error) {
    console.error("Error in authNeededCallback:", error);
    // Handle error appropriately, maybe by throwing an error or returning a default/fallback AuthSig
    throw new Error("authNeededCallback failed");
  }
};

  const sessionSigs = await litNodeClient.getSessionSigs({
    ...sessionSigsParams,
    authNeededCallback,
  });

  return sessionSigs;
}

export async function updateSessionSigs(
  params: GetSessionSigsProps
): Promise<SessionSigs> {
  const sessionSigs = await litNodeClient.getSessionSigs(params);
  return sessionSigs;
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
function getProviderByAuthMethod(authMethod: AuthMethod) {
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


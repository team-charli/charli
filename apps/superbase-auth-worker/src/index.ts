/* eslint-disable @typescript-eslint/no-unused-vars */
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken'; // Use 'npm:jsonwebtoken' when deploying to Cloudflare Workers

interface RequestBody {
  ethereumAddress: string;
  signature: string;
  nonce: string;
}

export interface Env {
  SUPABASE_JWT_SECRET: string;
  // Include any bindings you might need here, like KV, Durable Objects, R2, or services.
  // Example: MY_KV_NAMESPACE: KVNamespace;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Routing logic
    switch (url.pathname) {
      case '/jwt':
        return handleJWTRequest(request, env);
      case '/nonce':
        return handleNonceRequest(request, env);
      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

// JWT Worker Logic
async function handleJWTRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { ethereumAddress, signature, nonce } = await request.json() as RequestBody;
    const isVerified = await verifyUserSignature(ethereumAddress, signature, nonce);
    if (!isVerified) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid signature' }), { status: 401 });
    }

    const token = jwt.sign({ sub: ethereumAddress }, SUPABASE_JWT_SECRET, { algorithm: 'HS512' });
    return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } else {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

// Nonce Worker Logic
async function handleNonceRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Generate a 16-byte random nonce and convert it to a hex string
    const arrayBuffer = new Uint8Array(16);
    crypto.getRandomValues(arrayBuffer);
    const nonce = [...arrayBuffer].map(b => b.toString(16).padStart(2, '0')).join('');

    // Return the generated nonce in the response body
    return new Response(JSON.stringify({ nonce }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } else {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

// Helper function for JWT logic
async function verifyUserSignature(ethereumAddress: string, signature: string, nonce: string): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(nonce, signature);
    return recoveredAddress.toLowerCase() === ethereumAddress.toLowerCase();
  } catch (error) {
    console.error('Error in verifying signature:', error);
    return false;
  }
}

import { ethers } from 'ethers';
import { SignJWT } from 'jose';
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

function errorResponse(error: unknown): Response {
  if (error instanceof Error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: {...corsHeaders, 'Content-Type': 'application/json' } });
  } else {
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleNonceRequest(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const arrayBuffer = new Uint8Array(16);
    crypto.getRandomValues(arrayBuffer);
    const nonce = [...arrayBuffer].map(b => b.toString(16).padStart(2, '0')).join('');

    return new Response(JSON.stringify({ nonce }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

interface RequestBody {
  ethereumAddress: string;
  signature: string;
  nonce: string;
}

export interface Env {
  SUPABASE_JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    switch (url.pathname) {
      case '/jwt':
        return handleJWTRequest(request, env, corsHeaders);
      case '/nonce':
        return handleNonceRequest(request, env, corsHeaders);
      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

async function handleJWTRequest(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let requestBody: RequestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: corsHeaders });
  }

  const { ethereumAddress, signature, nonce } = requestBody;
  const isVerified = await verifyUserSignature(ethereumAddress, signature, nonce);
  if (!isVerified) {
    return new Response(JSON.stringify({ error: 'Unauthorized - Invalid signature' }), { status: 401 });
  }

  try {
    // Using SignJWT from jose to sign the JWT
    const encoder = new TextEncoder();
    const token = await new SignJWT({ aud: 'authenticated', sub: ethereumAddress, role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h') // Sets expiration time to 2 hours from now
      .sign(encoder.encode(env.SUPABASE_JWT_SECRET));

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: {...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch(error) {
    console.error('Error generating JWT:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: corsHeaders });
  }

  async function verifyUserSignature(ethereumAddress: string, signature: string, nonce: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(nonce, signature);
      return recoveredAddress.toLowerCase() === ethereumAddress.toLowerCase();
    } catch (error) {
      console.error('Error in verifying signature:', error);
      return false;
    }
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import { ethers } from 'ethers';
import jwt from '@tsndr/cloudflare-worker-jwt'

interface RequestBody {
  ethereumAddress: string;
  signature: string;
  nonce: string;
}

export interface Env {
  SUPABASE_JWT_SECRET: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Add CORS headers to the response
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Routing logic
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
    console.log("supabase secret", env.SUPABASE_JWT_SECRET)
    const token = await jwt.sign(
      {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 1.5), // 1.5 hour expiration
        sub: ethereumAddress,
        role: 'authenticated',
      },
      env.SUPABASE_JWT_SECRET,
      { algorithm: 'HS256' }
    );
    console.log('token', token)
    return new Response(JSON.stringify({ token }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch(error) {
    console.error('Error generating JWT:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: corsHeaders });
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

async function verifyUserSignature(ethereumAddress: string, signature: string, nonce: string): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(nonce, signature);
    return recoveredAddress.toLowerCase() === ethereumAddress.toLowerCase();
  } catch (error) {
    console.error('Error in verifying signature:', error);
    return false;
  }
}

function errorResponse(error: unknown): Response {
  if (error instanceof Error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  } else {
    return new Response('Internal Server Error', { status: 500 });
  }
}

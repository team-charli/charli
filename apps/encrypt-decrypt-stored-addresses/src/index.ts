/* eslint-disable @typescript-eslint/no-unused-vars */
import { encode as base64Encode, decode as base64Decode } from 'base64-arraybuffer';

export interface Env {
  ENCRYPTION_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      const { address } = await request.json() as { address: string };
      const encryptedAddress = await encryptAddress(address, env);
      return new Response(JSON.stringify({ encryptedAddress }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // else if (request.method === 'GET') {
    //   const { encryptedAddress } = await request.json() as { encryptedAddress: string };
    //   const decryptedAddress = await decryptAddress(encryptedAddress, env);
    //   return new Response(JSON.stringify({ address: decryptedAddress }), {
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }
    else {
      return new Response('Method not allowed', { status: 405 });
    }
  }
};

async function encryptAddress(address: string, env: Env): Promise<string> {
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ENCRYPTION_KEY),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    secretKey,
    new TextEncoder().encode(address)
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combinedArray = new Uint8Array([...iv, ...encryptedArray]);
  return base64Encode(combinedArray);
}

async function decryptAddress(encryptedAddress: string, env: Env): Promise<string> {
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ENCRYPTION_KEY),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const combinedArray = new Uint8Array(base64Decode(encryptedAddress));
  const iv = combinedArray.slice(0, 12);
  const encryptedArray = combinedArray.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    secretKey,
    encryptedArray
  );

  return new TextDecoder().decode(decryptedBuffer);
}

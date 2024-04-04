import { ethers } from 'ethers';

export interface Env {
  PRIVATE_KEY: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const wallet = new ethers.Wallet(env.PRIVATE_KEY);

      const currentTime = new Date();
      const joinedTimestamp = currentTime.toISOString();

      const signature = await wallet.signMessage(joinedTimestamp);

      const responseData = {
        timestamp: joinedTimestamp,
        signature: signature,
      };

      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred';
      return new Response(`Error: ${errorMessage}`, { status: 500 });
    }  },
};

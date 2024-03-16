/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 */
import bs58 from 'bs58'
import ethers, { Wallet, Contract, JsonRpcProvider} from 'ethers'
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { AuthMethodScope, AuthMethodType } from '@lit-protocol/constants';

interface Test_Env {
  litNetwork: "cayenne" | "custom" | "localhost" | "manzano" | "habanero" | undefined;
  debug: boolean;
  minNodeCount: number;

}

export interface Env {
  PRIVATE_KEY: string;
  CHRONICLE_RPC: string;
  TEST_ENV: Test_Env;
  IPFS_CID_PayTeacherFromController: string;
  LIT_NETWORK: "cayenne" | "custom" | "localhost" | "manzano" | "habanero" | undefined;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    function getBytesFromMultihash(multihash: string): string {
      const decoded = bs58.decode(multihash);
      return `0x${Buffer.from(decoded).toString("hex")}`;
    }
    const provider = new ethers.JsonRpcProvider("https://chain-rpc.litprotocol.com/http");
    const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
    const contractClient = new LitContracts({ signer: wallet, network: env.LIT_NETWORK});
    await contractClient.connect();
    const mintCost = await contractClient.pkpNftContract.read.mintCost();

    const pkpInfo = await contractClient.pkpNftContract.write.mintGrantAndBurnNext(AuthMethodType.LitAction, getBytesFromMultihash(env.IPFS_CID_PayTeacherFromController), { value: mintCost});
    console.log("pkpInfo", pkpInfo)
    const pkpInfoJson = JSON.stringify(pkpInfo, null, 2);

    return new Response(pkpInfoJson, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

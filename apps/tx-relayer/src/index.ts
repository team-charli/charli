import { ethers } from 'ethers';

export interface Env {
  RPC_URL: string;
  PRIVATE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);

    const { signedTx, expectedSender, usdcContractAddress, learnerAddress, controllerAddress, paymentAmount } = await request.json() as {
      signedTx: string;
      expectedSender: string;
      usdcContractAddress: string;
      learnerAddress: string;
      controllerAddress: string;
      paymentAmount: string;
    };

    const tx = ethers.Transaction.from(signedTx);

    if (!tx.from || tx.from !== expectedSender) {
      return new Response("Sender address does not match expected sender", { status: 403 });
    }

    const contract = new ethers.Contract(usdcContractAddress, [
      "function transferFrom(address sender, address recipient, uint256 amount) returns (boolean)"
    ], provider);

    const amountBigNumber = BigInt(paymentAmount);

    if (tx.data) {
      const txDataDecoded = contract.interface.parseTransaction({ data: tx.data });
      if (txDataDecoded?.name !== "transferFrom" ||
        txDataDecoded.args[0] !== learnerAddress ||
        txDataDecoded.args[1] !== controllerAddress ||
        !txDataDecoded.args[2].eq(amountBigNumber)) {
        return new Response("Transaction data does not match expected 'transferFrom' call", { status: 400 });
      }
    } else {
      return new Response("Missing transaction data", { status: 400 });
    }

    // Since the transaction is fully verified, proceed to send it
    const txResponse = await wallet.sendTransaction(tx);
    await txResponse.wait();

    return new Response(JSON.stringify(JSON.stringify({ transactionHash: txResponse.hash })), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
};

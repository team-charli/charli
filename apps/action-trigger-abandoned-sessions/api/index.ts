/*jsParams delete befor*/
import { LitNodeClientNodeJs as LitNodeClient } from "@lit-protocol/lit-node-client-nodejs";
import { AuthSig } from '@lit-protocol/types';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  const privateKey = process.env.DEV_PRIVATE_KEY
  const network = process.env.LIT_NETWORK;
  const litNodeClient = new LitNodeClient({ network });
  await litNodeClient.connect();
  const authSig = await generateSig()
  let claimActionRes;
  const ipfsId = process.env.IPFS_ID;
  try {
    claimActionRes = await litNodeClient.executeJs({
      authSig,
      ipfsId,
      authMethods: [],
      jsParams: {
        keyId
      },
    })
  } catch(error) {
    console.error(error);
    throw new Error(`Lit Action failed`)
  }
  //res.status(200).json({ message: 'Hello from Vercel with TypeScript!' });

  async function generateSig (): Promise<AuthSig> {
    const domain = process.env.DOMAIN;
    const origin = process.env.ORIGIN;
    const statement = "This is a test statement.  You can put anything you want here.";
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    let nonce = litNodeClient.getLatestBlockhash();
    if (typeof nonce !== "string") {
      throw new Error(`retrieved nonce from blockhash not a string`)
    }
    const siweMessage = new siwe.SiweMessage({
      domain,
      address: wallet.address,
      statement,
      uri: origin,
      version: "1",
      chainId: 1,
      nonce,
      expirationTime,
    });

    const messageToSign = siweMessage.prepareMessage();

    const signature = await wallet.signMessage(messageToSign);

    const recoveredAddress = ethers.verifyMessage(messageToSign, signature);

    if (recoveredAddress !== wallet.address) {
      throw new Error("Recovered address does not match wallet address");
    }

    const authSig = {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: messageToSign,
      address: recoveredAddress,
    };

    console.log("authSig", authSig);
    return authSig;
  }

};

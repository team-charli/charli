import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { useEffect, useState } from "react";

export const useSignTimestamp = (sessionSigs: SessionSigs| null, currentAccount: IRelayPKP | null) => {
  const [signature, setSignature] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      const signatureRes = await signTimestamp(sessionSigs, currentAccount);
      setSignature(signatureRes);
    })();
  }, [])
  return signature;
}

async function signTimestamp (sessionSigs: SessionSigs| null, currentAccount: IRelayPKP | null) {
  if (!sessionSigs) {
    throw new Error(`Missing sessionSigs`)
  }
  if (!currentAccount) {
    throw new Error(`Missing currentAccount`)
  }
  const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
  await pkpWallet.init()
  return await pkpWallet.signMessage(String(Date.now()))
}

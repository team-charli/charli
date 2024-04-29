import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { useEffect } from "react";

export const useSignSessionDuration = (sessionDuration: number, currentAccount: IRelayPKP, sessionSigs: SessionSigs) => {
  useEffect(() => {
    async function signSessionDuration() {
      const pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey
      })
      try {
        await pkpWallet.init();
        return await pkpWallet.signMessage(String(sessionDuration))
      } catch (error) {
        console.log(error)
        throw new Error();
      }
    }
    void (async () => {
      await signSessionDuration();
    })();
  })
}


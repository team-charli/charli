import { SignSessionDurationParams } from "@/types/types";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";

export default async function signSessionDuration ({sessionDuration, sessionSigs,
  currentAccount}: SignSessionDurationParams) {
  if (sessionSigs && currentAccount) {
    try {
  const pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
  });

    await pkpWallet.init();
    return await pkpWallet.signMessage(String(sessionDuration));
    } catch (e) {
      console.error(e);
      throw new Error('failed to sign session duration')
    }
  }
}


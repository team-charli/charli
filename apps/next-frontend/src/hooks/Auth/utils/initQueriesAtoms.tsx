import { authMethodAtom, authSigAtom, litAccountAtom, litNodeClientReadyAtom, nonceAtom, pkpWalletAtom, sessionSigsAtom, signatureAtom, supabaseJWTAtom } from "@/atoms/atoms";
import { useAtomValue } from "jotai";

export const useInitQueriesAtoms = () => {
  const jwt = useAtomValue(supabaseJWTAtom);
  const authMethod = useAtomValue(authMethodAtom);
  const litAccount = useAtomValue(litAccountAtom);
  const authSig = useAtomValue(authSigAtom);
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const pkpWallet = useAtomValue(pkpWalletAtom);
  const nonce = useAtomValue(nonceAtom);
  const signature = useAtomValue(signatureAtom);

  return {jwt, authMethod, litAccount, authSig, sessionSigs, litNodeClientReady, pkpWallet, nonce, signature   }

}




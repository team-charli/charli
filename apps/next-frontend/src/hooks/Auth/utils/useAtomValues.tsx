import { authMethodAtom, authSigAtom, isLitLoggedInAtom, isOAuthRedirectAtom, isOnboardedAtom, litAccountAtom,   pkpWalletAtom, sessionSigsAtom,supabaseJWTAtom } from "@/atoms/atoms";
import { useAtomValue } from "jotai";

export const useAtomValues = () => {
  const jwt = useAtomValue(supabaseJWTAtom);
  const authMethod = useAtomValue(authMethodAtom);
  const litAccount = useAtomValue(litAccountAtom);
  const authSig = useAtomValue(authSigAtom);
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const pkpWallet = useAtomValue(pkpWalletAtom);
  const isOnboarded = useAtomValue(isOnboardedAtom);
  const isLitLoggedIn = useAtomValue(isLitLoggedInAtom);
  const isOAuthRedirect = useAtomValue(isOAuthRedirectAtom);

  return { jwt, authMethod, litAccount, authSig, sessionSigs, pkpWallet,  isOnboarded, isLitLoggedIn, isOAuthRedirect  }
}




import { sessionSigsExpired } from "@/utils/app";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { useMemo } from "react"

export default function useIsLitLoggedIn(
  currentAccount: IRelayPKP | null,
  sessionSigs: SessionSigs | null
) {
  const isLitLoggedIn = useMemo(() => {
    // console.log('useIsLitLoggedIn called', { currentAccount: !!currentAccount, sessionSigs: !!sessionSigs });
    const result = currentAccount && sessionSigs && !sessionSigsExpired(sessionSigs);
    console.log('useIsLitLoggedIn result', result);
    return result;
  }, [currentAccount, sessionSigs]);
  return isLitLoggedIn;
}

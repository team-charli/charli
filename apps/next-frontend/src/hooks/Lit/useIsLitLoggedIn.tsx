import { sessionSigsExpired } from "@/utils/app";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { useMemo } from "react"

export default function useIsLitLoggedIn  (
  currentAccount: IRelayPKP | null,
  sessionSigs: SessionSigs | null
)  {
  const isLitLoggedIn = useMemo(() => {

    return currentAccount && sessionSigs && !sessionSigsExpired(sessionSigs);
  }, [currentAccount, sessionSigs]);

  return isLitLoggedIn;
};


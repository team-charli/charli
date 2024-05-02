import { sessionSigsExpired } from "@/utils/app";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import useLocalStorage from "@rehooks/local-storage";
import { useEffect, useState } from "react"

const useLitLoggedIn = () => {
  const [currentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const [sessionSigs] = useLocalStorage<SessionSigs>("sessionSigs")
  const [isLitLoggedIn, setIsLitLoggedIn] = useState(false);

  useEffect(() => {
      console.log('currentAccount', Boolean(currentAccount));
      console.log('sessionSigs', Boolean(sessionSigs));

    if (currentAccount && sessionSigs && !sessionSigsExpired(sessionSigs)) {
      console.log("set lit logged in = true")
      setIsLitLoggedIn(true)
    } else {
      console.log("set lit logged in = false")
      console.log('currentAccount', Boolean(currentAccount));
      console.log('sessionSigs', Boolean(sessionSigs));

      setIsLitLoggedIn(false);
    }
  }, [currentAccount, sessionSigs, setIsLitLoggedIn, sessionSigsExpired])
  return {isLitLoggedIn};
}
export default useLitLoggedIn;

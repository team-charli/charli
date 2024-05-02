import { sessionSigsExpired } from "@/utils/app";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import useLocalStorage from "@rehooks/local-storage";
import { useEffect, useState } from "react"

const useLitLoggedIn = () => {
  const [currentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const [sessionSigs] = useLocalStorage<SessionSigs>("sessionSigs")
  const [isLitLoggedIn, setIsLitLoggedIn] = useState(false);

  useEffect(() => {
    console.log('sessionSigs', sessionSigs)
    if (currentAccount && sessionSigs && !sessionSigsExpired(sessionSigs)) {
      console.log(JSON.stringify({setIsLitLoggedIn: true, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), sessionSigsExpired: sessionSigsExpired(sessionSigs)}));
      setIsLitLoggedIn(true)
    } else {
      console.log(JSON.stringify({setIsLitLoggedIn: false, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), sessionSigsExpired: sessionSigsExpired(sessionSigs)}));

      setIsLitLoggedIn(false);
    }
  }, [currentAccount, sessionSigs, setIsLitLoggedIn, sessionSigsExpired])
  return {isLitLoggedIn};
}
export default useLitLoggedIn;

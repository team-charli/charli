import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import useLocalStorage from "@rehooks/local-storage";
import { useEffect, useState } from "react"

const useLitLoggedIn = () => {
  const [currentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const [sessionSigs] = useLocalStorage<SessionSigs>("sessionSigs")
  const [isLitLoggedIn, setIsLitLoggedIn] = useLocalStorage<boolean>("isLitLoggedIn", false)

  useEffect(() => {
    if (currentAccount && sessionSigs) {
      setIsLitLoggedIn(true)
    }
  }, [currentAccount, sessionSigs, setIsLitLoggedIn])
  return isLitLoggedIn
}
export default useLitLoggedIn;

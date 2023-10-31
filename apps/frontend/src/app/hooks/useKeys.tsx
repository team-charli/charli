import { useState } from "react";

export const useKeys = () => {
  const [pkpKey, setPkpKey] = useState([])
  const [sessionKey, setSessionKey] = useState({})

  return {pkpKey, setPkpKey, sessionKey, setSessionKey}

}



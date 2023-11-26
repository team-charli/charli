import { useState } from "react";

export const use = () => {
  const [pkpKey, setPkpKey] = useState([])
  const [sessionKey, setSessionKey] = useState({})

  return {pkpKey, setPkpKey, sessionKey, setSessionKey}

}



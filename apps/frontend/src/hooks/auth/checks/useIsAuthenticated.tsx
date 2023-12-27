//HACK: check if has sigs to avoid login page.  real useIsAuthenticated will probably tie into existing oAuth
import { useState, useEffect } from 'react';

interface SessionKey {
 publicKey: string;
 privateKey: string;
}

export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let sessionKey = localStorage.getItem('lit-session-key');
    let accountPublicKey = localStorage.getItem('accountPubK')
    if (sessionKey) {
      const parsedSessionKey = JSON.parse(sessionKey) as SessionKey;
      if (parsedSessionKey && parsedSessionKey.publicKey.length && accountPublicKey && accountPublicKey.length) {
        setIsAuthenticated(true);
      }
    }
  })
 return isAuthenticated;
}


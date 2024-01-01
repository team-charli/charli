//HACK: check if has sigs to avoid login page.  real useIsAuthenticated will probably tie into existing oAuth
import { loadAccountAndSessionKeys } from 'apps/frontend/src/utils/app';
import { useState, useEffect } from 'react';


export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const {currentAccount, sessionSigs} = loadAccountAndSessionKeys();
  useEffect(() => {
    if (currentAccount && sessionSigs) {
      setIsAuthenticated(true)
    }
  }, [])
  return isAuthenticated;
}


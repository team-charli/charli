import {useEffect} from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import useLocalStorage from '@rehooks/local-storage';
import ClientSideRedirect from '@/components/ClientSideRedirect';

export const useRouteRedirect = () => {
  const {currentAccount, sessionSigs, authMethod} = useAuthContext();
  const [ isOnboarded ] = useLocalStorage("isOnboarded");

  useEffect(() => {
    console.log("useRouteRedirect: isOnboarded", isOnboarded)
    if (authMethod && currentAccount && sessionSigs) {
      if (!isOnboarded) {
        <ClientSideRedirect to='/onboard' />;
      } else {
        <ClientSideRedirect to='/lounge' />;
      }
    }
  }, [authMethod, currentAccount, sessionSigs, isOnboarded]);
}

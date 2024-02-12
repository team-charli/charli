import {useEffect} from 'react'
import { useHistory } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext'
import useLocalStorage from '@rehooks/local-storage';

export const useRouteRedirect = () => {
  const {currentAccount, sessionSigs, authMethod} = useAuthContext();
  const [ isOnboarded ] = useLocalStorage("isOnboarded");
  const history = useHistory();

  useEffect(() => {

    if (authMethod && currentAccount && sessionSigs) {
      if (!isOnboarded) {
        history.push('/onboard');
      } else {
        history.push('/lounge');
      }
    }
  }, [authMethod, currentAccount, sessionSigs, history]);
}

import {useEffect} from 'react'
import { useHistory } from 'react-router-dom';
import { useContextNullCheck } from  './utils/useContextNullCheck'
import { AuthContext, useAuthContext } from '../contexts/AuthContext'

export const useRouteRedirect = () => {
  const {currentAccount, sessionSigs, authMethod} = useAuthContext();
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

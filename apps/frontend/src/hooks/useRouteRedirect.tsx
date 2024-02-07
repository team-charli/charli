import {useEffect} from 'react'
import { useHistory } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext'
import { useOnboardContext } from '../contexts/OnboardContext';

export const useRouteRedirect = () => {
  const {currentAccount, sessionSigs, authMethod} = useAuthContext();
  const {isOnboarded} = useOnboardContext();
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

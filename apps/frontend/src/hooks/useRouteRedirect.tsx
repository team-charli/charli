import {useEffect} from 'react'
import { useHistory } from 'react-router-dom';
import { useContextNullCheck } from  './utils/useContextNullCheck'
import { AuthContext } from '../contexts/AuthContext'
import { OnboardContext } from '../contexts/OnboardContext'
import { loadAccountAndSessionKeys } from '../utils/app';

export const useRouteRedirect = () => {
  const {isOnboarded} = useContextNullCheck(OnboardContext);
  const {authMethod} = useContextNullCheck(AuthContext)
  const {currentAccount, sessionSigs} = loadAccountAndSessionKeys();
  const history = useHistory();

  useEffect(() => {
    if (authMethod && currentAccount && sessionSigs) {
      if (!isOnboarded) {
       history.push('/onboard');
      } else {
      history.push('/lounge');
      }
    }
  }, [authMethod, currentAccount, sessionSigs, isOnboarded, history]);

}

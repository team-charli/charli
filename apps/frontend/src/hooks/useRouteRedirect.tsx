import {useEffect} from 'react'
import { useHistory } from 'react-router-dom';
import { useContextNullCheck } from  './utils/useContextNullCheck'
import { AuthContext } from '../contexts/AuthContext'
import { OnboardContext } from '../contexts/OnboardContext'
const {isOnboarded} = useContextNullCheck(OnboardContext);
const {authMethod, currentAccount, sessionSigs} = useContextNullCheck(AuthContext)
export const useRouteRedirect = () => {

  const history = useHistory();
  useEffect(() => {
    if (authMethod) {
      if (!isOnboarded) {
        // Redirect to Lounge with state
       history.push('/onboard', { currentAccount, sessionSigs });
      } else {
        // Redirect to Onboard with state
      history.push('/lounge', { currentAccount, sessionSigs });
      }
    }
  }, [authMethod, isOnboarded, history]);

}

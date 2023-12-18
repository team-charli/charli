import {useEffect} from 'react'
import { useHistory } from 'react-router-dom';
import { useContextNullCheck } from  './utils/useContextNullCheck'
import { AuthContext } from '../contexts/AuthContext'
import { OnboardContext } from '../contexts/OnboardContext'

export const useRouteRedirect = () => {
  const {isOnboarded} = useContextNullCheck(OnboardContext);
  const {authMethod} = useContextNullCheck(AuthContext)

  const history = useHistory();

  useEffect(() => {
    if (authMethod) {
      if (!isOnboarded) {
       history.push('/onboard');
      } else {
      history.push('/lounge');
      }
    }
  }, [authMethod, isOnboarded, history]);

}

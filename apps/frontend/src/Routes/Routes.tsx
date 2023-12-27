import {useEffect} from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { OnboardContext } from '../contexts/OnboardContext'
import { useContextNullCheck } from '../hooks/utils/useContextNullCheck'
import { Switch, Route, Redirect} from 'react-router-dom';
import {PrivateRouteProps} from '../types/types'
import {useReturnToRoom} from '../hooks/utils/useReturnToRoom'
import Entry from './Entry'
import Login from './Auth/Login'
import Onboard from './Onboard/Onboard'
import Bolsa from './Bolsa/Bolsa'
import Lounge from './Lounge/Lounge'
import Room from './Room/Room'

const Routes = () => {
  const {isAuthenticated} = useContextNullCheck(AuthContext);
  const { isOnboarded, onboardMode  } = useContextNullCheck(OnboardContext);
  useReturnToRoom()

  useEffect(() => {
    // console.log(`isAuthenticated ${isAuthenticated}`)
  }, [isAuthenticated])

  const AuthedAndOnboarded:React.FC<PrivateRouteProps>  = ({component: Component, ...rest}) => {
    return (
      <Route
        {...rest}
        render={props => {
          if (isAuthenticated && isOnboarded) {
            console.log(`isAuthenticated == true; isOnboarded == true`)

            return <Component {...props} />;
          }
          if (isAuthenticated && !isOnboarded) {
            // console.log(`isAuthenticated == true; isOnboarded == false`)

            return <Redirect to="/onboard" />;
          }
          console.log(`access to protected route failed. isAuthenticated == ${isAuthenticated} isOnboarded == ${isOnboarded}`)
          return <Redirect to="/login" />;
        }}
      />
    );
  }
  return (
    <Switch>
      <Route exact path="/" component={Entry} />
      <Route path="/onboard" component={Onboard} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/bolsa" component={Bolsa} />
      <AuthedAndOnboarded path="/lounge" component={Lounge} />
      <AuthedAndOnboarded path="/room" component={Room} />
    </Switch>
  );

}
export default Routes


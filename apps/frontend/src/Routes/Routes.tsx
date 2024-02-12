import {useEffect} from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useOnboardContext } from '../contexts/OnboardContext'
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
  const { currentAccount, sessionSigs } = useAuthContext()
  const { isOnboarded } = useOnboardContext();
  const isAuthenticated = Boolean(currentAccount && sessionSigs)

  const AuthedAndOnboarded:React.FC<PrivateRouteProps>  = ({component: Component, ...rest}) => {

    return (
      <Route
        {...rest}
        render={props => {
          if (isAuthenticated && isOnboarded) {
            return <Component {...props} />;
          } else if (isAuthenticated && !isOnboarded) {
            console.log('redirecting to /onboard')
            return <Redirect to="/onboard" />;
          }
          console.log(`redirecting to /login; !onBoarded && !authenticated`)
          return <Redirect to="/login" />;
        }}
      />
    );
  }
  return (
    <Switch>
      <Route exact path="/" component={Entry} />
      <Route path="/login" component={Login} />
      <AuthedAndOnboarded path="/lounge" component={Lounge} />
      <AuthedAndOnboarded path="/room" component={Room} />
      <Route path="/onboard" component={Onboard} />
      <Route path="/signup" component={Login} />
      <Route path="/bolsa" component={Bolsa} />
    </Switch>
  );

}
export default Routes

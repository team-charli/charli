import { Switch, Route, Redirect} from 'react-router-dom';
import {PrivateRouteProps} from '../types/types'
import {useIsAuthenticated} from '../hooks/useIsAuthenticated'
import {useReturnToRoom} from '../hooks/useReturnToRoom'
import { useIsOnboarded } from '../hooks/useIsOnboarded'
import Entry from './Entry'
import Login from './Auth/Login'
import Onboard from './Onboard/Onboard'
import Bolsa from './Bolsa/Bolsa'
import Lounge from './Lounge/Lounge'
import Room from './Room/Room'

const Routes = () => {
  useReturnToRoom()
  return (
    <Switch>
      <Route exact path="/" component={Entry} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/bolsa" component={Bolsa} />
      <Authed path="/onboard" component={Onboard} />
      <AuthedAndOnboarded path="/lounge" component={Lounge} />
      <AuthedAndOnboarded path="/room" component={Room} />

    </Switch>

  )};

const Authed:React.FC<PrivateRouteProps>  = ({component: Component, ...rest}) => {
  const isOnboarded: Boolean | null = useIsOnboarded()
  console.log({isOnboarded})

  const isAuthenticated: Boolean = useIsAuthenticated();
  console.log('isAuthenticated:', isAuthenticated)
  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
}

const AuthedAndOnboarded:React.FC<PrivateRouteProps>  = ({component: Component, ...rest}) => {

  const isAuthenticated: Boolean = useIsAuthenticated();
  const isOnboarded: Boolean | null = useIsOnboarded()
  console.log({isOnboarded})
  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated && isOnboarded ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
}


export default Routes




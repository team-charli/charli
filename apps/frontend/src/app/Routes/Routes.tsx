import { Switch, Route, Redirect, RouteProps } from 'react-router-dom';
import {PrivateRouteProps} from '../types/types'
import {useIsAuthenticated} from '../hooks/useIsAuthenticated'
import {useReturnToRoom} from '../hooks/useReturnToRoom'
import AuthSignUp from './Auth/AuthSignUp'
import Login from './Auth/Login'
import Onboard from './Onboard/Onboard'
import Lounge from './Lounge/Lounge'
import Room from './Room/Room'
const Routes = () => {
  useReturnToRoom()
  return (
    <Switch>
      <Route exact path="/" component={AuthSignUp} />
      <Route path="/login" component={Login} />
      <PrivateRoute path="/onboard" component={Onboard} />
      <PrivateRoute path="/lounge" component={Lounge} />
      <PrivateRoute path="/room" component={Room} />

    </Switch>

  )};

const PrivateRoute:React.FC<PrivateRouteProps>  = ({component: Component, ...rest}) => {

  const isAuthenticated = useIsAuthenticated();

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
export default Routes




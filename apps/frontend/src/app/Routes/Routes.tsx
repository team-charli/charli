import { Switch, Route, Redirect, RouteProps } from 'react-router-dom';
import Login from './Auth/Login'
import {useIsAuthenticated} from '../hooks/useIsAuthenticated'
import Onboard from './Onboard/Onboard'
import Lounge from './Lounge/Lounge'

const Routes = () => (
<Switch>
    <Route exact path="/" component={Login} />
    <Route path="/login" component={Login} />
    <PrivateRoute path="/onboard" component={Onboard} />
    <PrivateRoute path="/lounge" component={Lounge} />
</Switch>

);

interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}
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




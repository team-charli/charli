import { Switch, Route } from 'react-router-dom';
import OnboardAndAuthCheck  from "./OnboardAndAuthCheck";
import Login from './Auth/Login'

const Routes = () => (
<Switch>
    <Route exact path="/" component={Login} />
    <Route path="/onboard" component={Login} />
    <Route path="/login" component={Login} />
    <Route path="/lounge" component={Login} />
</Switch>

);

export default Routes




import { Switch, Route } from 'react-router-dom';
import AuthAndOnboardCheck  from "./AuthAndOnboardCheck";

const Routes = () => (
<Switch>
    <Route exact path="/" component={AuthAndOnboardCheck} />
</Switch>

);

export default Routes




import 'dotenv/config'
console.log(process.env) // remove this after you've confirmed it is working
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter as Router
} from "react-router-dom";
import App from './app/app';
import ErrorBoundary from './app/Components/Errors/ErrorBoundary';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>
);

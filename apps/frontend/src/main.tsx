if (process.env.NODE_ENV === 'development') {
  const originalFetch = window.fetch;
  let requestCount = 0;
  const MAX_REQUESTS = 50;

  window.fetch = async (...args) => {
    requestCount++;

    if (requestCount > MAX_REQUESTS) {
      throw new Error(`Max request limit of ${MAX_REQUESTS} exceeded`);
    }
    return originalFetch(...args);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    requestCount++;
    if (requestCount > MAX_REQUESTS) {
      throw new Error(`Max request limit of ${MAX_REQUESTS} exceeded`);
    }
    originalSend.apply(this, args);
  };
}

import "./index.css" // make sure the path.
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter as Router
} from "react-router-dom";
import App from './app';
import ErrorBoundary from './Components/Errors/ErrorBoundary';

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

//TODO: After onboard, before lounge, verfiy multiple entrypoints. 1.) (from slides). 2.) From bolsa
//TODO: Also figure out how to ask if teach and learn? Maybe a one more thing..."Do you wanna teach|learn as well? nah.. or sure.. (then what to teach|learn)"


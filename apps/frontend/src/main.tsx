import "./index.css" // make sure the path.
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter as Router
} from "react-router-dom";
import App from './app';
import ErrorBoundary from './Components/Errors/ErrorBoundary';
// import * as Sentry from "@sentry/react";

// Sentry.init({
//   dsn: "https://d4d1d1a8e6d297ce788e9eac167e20e0@o4506730635657216.ingest.sentry.io/4506730681008128",
//   integrations: [
//     Sentry.browserTracingIntegration(),
//     Sentry.replayIntegration({
//       maskAllText: false,
//       blockAllMedia: false,
//     }),
//   ],
//   // Performance Monitoring
//   tracesSampleRate: 1.0, //  Capture 100% of the transactions
//   // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
//   tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
//   // Session Replay
//   replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
//   replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
// });

// const container = document.getElementById('root')!;
// const root = ReactDOM.createRoot(container);

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


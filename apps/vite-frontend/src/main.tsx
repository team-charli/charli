import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import * as Sentry from "@sentry/react";

//Sentry.init({
//  dsn: "https://8a6362eb09d477548d5ba7267dd3e2e3@o4508724171440128.ingest.us.sentry.io/4508724174782464",
//  integrations: [
//    Sentry.browserTracingIntegration(),
//    Sentry.replayIntegration(),
//  ],
//  // Tracing
//  tracesSampleRate: 1.0, //  Capture 100% of the transactions
//  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
//  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
//  // Session Replay
//  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
//  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
//});


// Add viewport meta tag for proper responsive design
if (!document.querySelector('meta[name="viewport"]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  document.getElementsByTagName('head')[0].appendChild(meta);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 antialiased text-slate-900 dark:text-slate-50">
    <App />
  </div>
)


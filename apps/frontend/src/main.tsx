import { WagmiConfig, configureChains, mainnet } from 'wagmi'
import {config} from '../wagmi.config'
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
{ /*     <WagmiConfig config={config}> */}
        <Router>
          <App />
        </Router>
   {/*  </WagmiConfig> */}
    </ErrorBoundary>
  </StrictMode>
);

//TODO: After onboard, before lounge, verfiy multiple entrypoints. 1.) (from slides). 2.) From bolsa
//TODO: Also figure out how to ask if teach and learn? Maybe a one more thing..."Do you wanna teach|learn as well? nah.. or sure.. (then what to teach|learn)"


import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import setupGlobalErrorHandlers from './setupGlobalErrorHandlers';

// setupGlobalErrorHandlers();


ReactDOM.createRoot(document.getElementById('root')!).render(<App />)


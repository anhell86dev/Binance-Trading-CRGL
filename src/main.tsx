import React from 'react';
import ReactDOM from 'react-dom/client';
import { NavigationProvider } from './context/NavigationContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NavigationProvider>
      <App />
    </NavigationProvider>
  </React.StrictMode>
);

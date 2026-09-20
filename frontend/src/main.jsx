import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import './index.css';

function AppWithSplash() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Show smooth intro splash for 500ms on first load then transition in
    const timer = setTimeout(() => setSplashDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SplashScreen done={splashDone} />
      <App />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppWithSplash />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

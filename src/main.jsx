// Bootstrap React and keep authentication state available to the full app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './screens/AuthContext.jsx';
import './styles/TheGoodGuysDashboard.css';

// StrictMode surfaces development issues; providers wrap every dashboard route.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

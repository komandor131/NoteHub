import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './AuthContext'
import { ConfirmProvider } from './context/ConfirmContext'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import { I18nProvider } from './i18n/I18nProvider'
import BackendWakeUp from './components/BackendWakeUp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackendWakeUp>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BackendWakeUp>
  </StrictMode>,
)

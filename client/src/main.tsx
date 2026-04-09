import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/i18n'
import './index.css'
import { App } from './App'
import { AuthProvider } from '@/contexts/AuthContext'
import { setOfflineApiBase } from '@/services/offline'
import { captureInstallPrompt } from '@/landing/installPromptStore'

window.addEventListener('beforeinstallprompt', captureInstallPrompt)

const apiBase = import.meta.env.VITE_API_URL
if (typeof apiBase === 'string' && apiBase.length > 0) {
  void setOfflineApiBase(apiBase)
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

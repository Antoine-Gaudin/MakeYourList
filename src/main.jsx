import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { registerSW } from 'virtual:pwa-register'

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      if (confirm('Une nouvelle version est disponible. Mettre à jour ?')) {
        window.location.reload()
      }
    },
  })
}

// Capture the beforeinstallprompt event for the install button
window.__pwaInstallPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__pwaInstallPrompt = e
  window.dispatchEvent(new Event('pwa-install-available'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)


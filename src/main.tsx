
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      console.log('Service Worker registrado correctamente')
    }
  },
  onRegisterError(error) {
    console.error('Error al registrar Service Worker:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

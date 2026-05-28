import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

window.addEventListener('error', (e) => {
  const root = document.getElementById('root')
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="padding:2rem;font-family:monospace;background:#fff3cd;border:2px solid #c1440e;border-radius:8px;margin:2rem;color:#5c2d0d">
      <h2 style="margin:0 0 1rem">Error al iniciar la app</h2>
      <pre style="white-space:pre-wrap;font-size:12px">${e.message}\n\n${e.filename}:${e.lineno}:${e.colno}</pre>
    </div>`
  }
})

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
} catch (e) {
  document.getElementById('root').innerHTML = `<div style="padding:2rem;font-family:monospace;background:#fff3cd;border:2px solid #c1440e;border-radius:8px;margin:2rem;color:#5c2d0d">
    <h2 style="margin:0 0 1rem">Error crítico</h2>
    <pre style="white-space:pre-wrap;font-size:12px">${e.message}\n\n${e.stack}</pre>
  </div>`
}

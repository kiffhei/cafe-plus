#!/bin/bash
# Script de setup completo para Café Plus
# Ejecutar desde dentro de la carpeta cafe-plus

echo "🚀 Iniciando setup de Café Plus..."

# ── tailwind.config.js ────────────────────────────────────────
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          50:  '#fdf8f3',
          100: '#f5e6d3',
          200: '#e8c9a0',
          300: '#d4a96a',
          400: '#c08040',
          500: '#8B4513',
          600: '#7a3d11',
          700: '#5c2d0d',
          800: '#3d1e08',
          900: '#1f0f04',
        },
        crema: {
          50:  '#fffdf9',
          100: '#fef9f0',
          200: '#fdf0dc',
          300: '#fae4c0',
          400: '#f5d49a',
          500: '#F5DEB3',
        },
        terracota: {
          400: '#e07850',
          500: '#C1440E',
          600: '#a83a0c',
          700: '#8a2f0a',
        },
        olivo: {
          400: '#8a9a5b',
          500: '#6B7C3D',
          600: '#5a6832',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'warm':    '0 4px 24px rgba(139, 69, 19, 0.12)',
        'warm-lg': '0 8px 40px rgba(139, 69, 19, 0.18)',
        'card':    '0 2px 12px rgba(139, 69, 19, 0.08)',
      },
    },
  },
  plugins: [],
}
EOF

# ── index.html ────────────────────────────────────────────────
cat > index.html << 'EOF'
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Café Plus</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# ── .env ──────────────────────────────────────────────────────
cat > .env << 'EOF'
VITE_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
VITE_N8N_WEBHOOK=https://TU_N8N/webhook/cafe-analisis
EOF

# ── src/index.css ─────────────────────────────────────────────
cat > src/index.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --cafe:      #8B4513;
  --cafe-dark: #5c2d0d;
  --crema:     #F5DEB3;
  --crema-bg:  #fdf8f3;
  --terracota: #C1440E;
  --olivo:     #6B7C3D;
  --texto:     #2c1810;
  --texto-sub: #7a5c4a;
  --borde:     #e8c9a0;
}

* { box-sizing: border-box; }

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background-color: var(--crema-bg);
  color: var(--texto);
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f5e6d3; }
::-webkit-scrollbar-thumb { background: #d4a96a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--cafe); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

.animate-fade-in    { animation: fadeIn 0.35s ease forwards; }
.animate-slide-left { animation: slideInLeft 0.3s ease forwards; }

@layer components {
  .btn-primary {
    @apply bg-cafe-500 text-crema-100 font-medium px-4 py-2 rounded-lg
           hover:bg-cafe-600 active:bg-cafe-700 transition-all duration-150
           disabled:opacity-50 disabled:cursor-not-allowed shadow-warm;
  }
  .btn-secondary {
    @apply bg-crema-200 text-cafe-700 font-medium px-4 py-2 rounded-lg
           border border-cafe-200 hover:bg-crema-300 transition-all duration-150;
  }
  .btn-danger {
    @apply bg-terracota-500 text-white font-medium px-4 py-2 rounded-lg
           hover:bg-terracota-600 transition-all duration-150;
  }
  .input-field {
    @apply w-full bg-white border border-cafe-200 rounded-lg px-3 py-2
           text-sm text-cafe-900 placeholder-cafe-300
           focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent
           transition-all duration-150;
  }
  .card {
    @apply bg-white rounded-xl border border-cafe-100 shadow-card p-4;
  }
  .badge-canal-local     { @apply bg-olivo-500 text-white text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-canal-didi      { @apply bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-canal-rappi     { @apply bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-canal-ubereats  { @apply bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-estado-pendiente   { @apply bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-estado-preparacion { @apply bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-estado-entregado   { @apply bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium; }
  .badge-estado-cancelado   { @apply bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium; }
}
EOF

# ── src/main.jsx ──────────────────────────────────────────────
cat > src/main.jsx << 'EOF'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
EOF

# ── src/context/AuthContext.jsx ───────────────────────────────
cat > src/context/AuthContext.jsx << 'EOF'
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [token, setToken] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem('cafe_token')
    const savedUser  = localStorage.getItem('cafe_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setReady(true)
  }, [])

  function login(userData, userToken) {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('cafe_token', userToken)
    localStorage.setItem('cafe_user',  JSON.stringify(userData))
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('cafe_token')
    localStorage.removeItem('cafe_user')
  }

  const isAdmin  = user?.categoria === 'admin'
  const isCajero = user?.categoria === 'cajero'

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isCajero, ready }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
EOF

# ── src/api/api.js ────────────────────────────────────────────
cat > src/api/api.js << 'EOF'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
const N8N  = import.meta.env.VITE_N8N_WEBHOOK

function getToken() {
  return localStorage.getItem('cafe_token') || ''
}

async function apiGet(action, params = {}) {
  const res = await axios.get(BASE, {
    params: { action, token: getToken(), ...params }
  })
  return res.data
}

async function apiPost(action, body = {}) {
  const res = await axios.post(
    `${BASE}?action=${action}&token=${getToken()}`,
    body,
    { headers: { 'Content-Type': 'text/plain' } }
  )
  return res.data
}

export const auth = {
  login: (usuario, password) =>
    axios.post(
      `${BASE}?action=login`,
      { usuario, password },
      { headers: { 'Content-Type': 'text/plain' } }
    ).then(r => r.data),
}

export const usuarios = {
  getAll:  ()     => apiGet('getUsuarios'),
  create:  (data) => apiPost('createUsuario', data),
  update:  (data) => apiPost('updateUsuario', data),
  toggle:  (id, activo) => apiPost('toggleUsuario', { id_usuario: id, activo }),
}

export const productos = {
  getAll:  (params = {}) => apiGet('getProductos', params),
  create:  (data)        => apiPost('createProducto', data),
  update:  (data)        => apiPost('updateProducto', data),
  toggle:  (id, activo)  => apiPost('toggleProducto', { id_producto: id, activo }),
}

export const clientes = {
  getAll:      (params = {}) => apiGet('getClientes', params),
  create:      (data)        => apiPost('createCliente', data),
  update:      (data)        => apiPost('updateCliente', data),
  toggle:      (id, activo)  => apiPost('toggleCliente', { id_cliente: id, activo }),
  sumarVisita: (id)          => apiPost('sumarVisita', { id_cliente: id }),
}

export const pedidos = {
  getAll:       (params = {}) => apiGet('getPedidos', params),
  getById:      (id)          => apiGet('getPedidoById', { id }),
  create:       (data)        => apiPost('createPedido', data),
  updateEstado: (id, estado)  => apiPost('updateEstado', { id_pedido: id, estado }),
}

export const analytics = {
  getPeriodo: (desde, hasta) => apiGet('getAnalytics', { fecha_desde: desde, fecha_hasta: hasta }),
}

export const agente = {
  analizar: (payload) => axios.post(N8N + '/analizar', payload).then(r => r.data),
  chat: (mensaje, historial, contexto) =>
    axios.post(N8N + '/chat', { mensaje, historial, contexto }).then(r => r.data),
}

export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Mexico_City'
  }).format(d)
}

export function canalBadge(canal) {
  const map = {
    local:    { label: 'Local',     cls: 'badge-canal-local' },
    didi:     { label: 'DiDi Food', cls: 'badge-canal-didi' },
    rappi:    { label: 'Rappi',     cls: 'badge-canal-rappi' },
    ubereats: { label: 'Uber Eats', cls: 'badge-canal-ubereats' },
  }
  return map[canal] || { label: canal, cls: 'bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full' }
}

export function estadoBadge(estado) {
  const map = {
    pendiente:   { label: 'Pendiente',  cls: 'badge-estado-pendiente' },
    preparacion: { label: 'En prep.',   cls: 'badge-estado-preparacion' },
    entregado:   { label: 'Entregado',  cls: 'badge-estado-entregado' },
    cancelado:   { label: 'Cancelado',  cls: 'badge-estado-cancelado' },
  }
  return map[estado] || { label: estado, cls: '' }
}
EOF

# ── src/components/ProtectedRoute.jsx ────────────────────────
cat > src/components/ProtectedRoute.jsx << 'EOF'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, ready } = useAuth()

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-crema-50">
      <div className="text-cafe-500 text-sm animate-pulse">Cargando...</div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.categoria !== 'admin') return <Navigate to="/pedido" replace />

  return children
}
EOF

# ── src/components/Sidebar.jsx ───────────────────────────────
cat > src/components/Sidebar.jsx << 'EOF'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Nuevo Pedido',  path: '/pedido',      roles: ['admin','cajero'],
    icon: 'M12 4v16m8-8H4' },
  { label: 'Pedidos del Día', path: '/pedidos-hoy', roles: ['admin','cajero'],
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: 'Historial',     path: '/historial',   roles: ['admin','cajero'],
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Clientes Plus', path: '/clientes',    roles: ['admin','cajero'],
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Análisis IA',   path: '/analisis',    roles: ['admin','cajero'],
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Productos',     path: '/productos',   roles: ['admin'], adminSection: true,
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { label: 'Usuarios',      path: '/usuarios',    roles: ['admin'],
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  const items = NAV_ITEMS.filter(i => i.roles.includes(user?.categoria))

  return (
    <aside className={`flex flex-col bg-cafe-800 text-crema-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen shrink-0`}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-cafe-700">
        <div className="w-8 h-8 rounded-lg bg-terracota-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">C+</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="font-semibold text-crema-100 text-sm leading-tight">Café Plus</p>
            <p className="text-cafe-400 text-xs">{isAdmin ? 'Administrador' : 'Cajero'}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map(item => (
          <div key={item.path}>
            {item.adminSection && !collapsed && (
              <p className="text-cafe-500 text-xs uppercase tracking-wider px-2 pt-4 pb-1">Administración</p>
            )}
            {item.adminSection && collapsed && <div className="border-t border-cafe-700 my-2" />}
            <NavLink
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150
                ${isActive ? 'bg-cafe-600 text-crema-100' : 'text-cafe-300 hover:bg-cafe-700 hover:text-crema-200'}
                ${collapsed ? 'justify-center' : ''}`
              }
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="border-t border-cafe-700 p-3">
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="text-crema-200 text-xs font-medium truncate">{user?.nombre}</p>
            <p className="text-cafe-400 text-xs truncate">{user?.usuario}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-cafe-400 hover:bg-cafe-700 hover:text-red-400 transition-all text-sm ${collapsed ? 'justify-center' : ''}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button onClick={onToggle}
          className="flex items-center justify-center w-full px-2 py-2 rounded-lg text-cafe-500 hover:bg-cafe-700 hover:text-cafe-300 transition-all mt-1">
          <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}
EOF

# ── src/components/Layout.jsx ─────────────────────────────────
cat > src/components/Layout.jsx << 'EOF'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/pedido':      'Nuevo Pedido',
  '/pedidos-hoy': 'Pedidos del Día',
  '/historial':   'Historial de Pedidos',
  '/clientes':    'Clientes Plus',
  '/analisis':    'Análisis IA',
  '/productos':   'Gestión de Productos',
  '/usuarios':    'Gestión de Usuarios',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Café Plus'

  return (
    <div className="flex min-h-screen bg-crema-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-cafe-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h1 className="font-semibold text-cafe-800 text-lg leading-tight">{title}</h1>
            <p className="text-cafe-400 text-xs mt-0.5">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long',
                timeZone: 'America/Mexico_City'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-cafe-700 text-sm font-medium">{user?.nombre}</p>
              <p className="text-cafe-400 text-xs capitalize">{user?.categoria}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-cafe-500 flex items-center justify-center">
              <span className="text-crema-100 text-sm font-semibold">{user?.nombre?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div className="animate-fade-in max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
EOF

# ── src/App.jsx ───────────────────────────────────────────────
cat > src/App.jsx << 'EOF'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout      from './components/Layout'
import Login       from './pages/Login'
import NuevoPedido from './pages/NuevoPedido'
import PedidosHoy  from './pages/PedidosHoy'
import Historial   from './pages/Historial'
import Clientes    from './pages/Clientes'
import Analisis    from './pages/Analisis'
import Productos   from './pages/Productos'
import Usuarios    from './pages/Usuarios'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/pedido" replace />} />
            <Route path="pedido"      element={<NuevoPedido />} />
            <Route path="pedidos-hoy" element={<PedidosHoy />} />
            <Route path="historial"   element={<Historial />} />
            <Route path="clientes"    element={<Clientes />} />
            <Route path="analisis"    element={<Analisis />} />
            <Route path="productos"   element={<ProtectedRoute adminOnly><Productos /></ProtectedRoute>} />
            <Route path="usuarios"    element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
EOF

# ── src/pages/Login.jsx ───────────────────────────────────────
cat > src/pages/Login.jsx << 'EOF'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api/api'

export default function Login() {
  const [form,    setForm]    = useState({ usuario: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.usuario || !form.password) { setError('Ingresa usuario y contraseña'); return }
    setLoading(true); setError('')
    try {
      const res = await auth.login(form.usuario, form.password)
      if (res.ok) { login(res.data, res.data.token); navigate('/', { replace: true }) }
      else setError(res.message || 'Credenciales incorrectas')
    } catch { setError('Error de conexión. Verifica tu red.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-cafe-900 overflow-hidden relative">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cafe-800 via-cafe-900 to-cafe-900" />
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:`radial-gradient(circle at 20% 50%, #C1440E 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B4513 0%, transparent 40%)`}} />
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border border-cafe-700 opacity-30" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full border border-cafe-700 opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-terracota-500 flex items-center justify-center shadow-warm-lg">
              <span className="text-white font-bold text-lg">C+</span>
            </div>
            <span className="text-crema-100 text-xl font-semibold">Café Plus</span>
          </div>
          <h2 className="text-crema-100 text-4xl font-bold leading-tight mb-4">
            El sabor de la<br /><span className="text-terracota-400">eficiencia</span>
          </h2>
          <p className="text-cafe-400 text-base leading-relaxed max-w-xs">
            Sistema de gestión diseñado para cafeterías que trabajan con pasión. Cuautitlán, Estado de México.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[{label:'Pedidos hoy',value:'—'},{label:'Clientes Plus',value:'—'},{label:'Producto top',value:'—'},{label:'Ventas del día',value:'—'}].map(s => (
            <div key={s.label} className="bg-cafe-800/60 backdrop-blur-sm rounded-xl p-4 border border-cafe-700">
              <p className="text-cafe-400 text-xs font-medium mb-1">{s.label}</p>
              <p className="text-crema-200 font-semibold text-lg">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative bg-crema-50">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:`radial-gradient(circle, #d4a96a 1px, transparent 1px)`,backgroundSize:'24px 24px'}} />
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-terracota-500 flex items-center justify-center">
              <span className="text-white font-bold">C+</span>
            </div>
            <span className="text-cafe-800 text-lg font-semibold">Café Plus</span>
          </div>
          <div className="mb-8">
            <h1 className="text-cafe-800 text-3xl font-bold mb-1">Bienvenido</h1>
            <p className="text-cafe-400 text-sm">Ingresa tus credenciales para continuar</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-cafe-700 text-sm font-medium mb-1.5">Usuario</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </span>
                <input type="text" className="input-field pl-9" placeholder="tu_usuario"
                  value={form.usuario} onChange={e => setForm(f => ({...f, usuario: e.target.value}))}
                  autoComplete="username" autoFocus />
              </div>
            </div>
            <div>
              <label className="block text-cafe-700 text-sm font-medium mb-1.5">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </span>
                <input type={showPw ? 'text' : 'password'} className="input-field pl-9 pr-10" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cafe-400 hover:text-cafe-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPw
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center gap-2 animate-fade-in">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 text-base">
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Verificando...</>
              ) : 'Ingresar al sistema'}
            </button>
          </form>
          <p className="text-center text-cafe-300 text-xs mt-8">Café Plus · Sistema de Gestión v1.0</p>
        </div>
      </div>
    </div>
  )
}
EOF

# ── src/pages — placeholders ──────────────────────────────────
for page in NuevoPedido PedidosHoy Historial Clientes Analisis Productos Usuarios; do
cat > src/pages/${page}.jsx << EOF
export default function ${page}() {
  return (
    <div className="card">
      <p className="text-cafe-500 text-sm">Módulo <strong>${page}</strong> — en desarrollo</p>
    </div>
  )
}
EOF
done

echo ""
echo "✅ Setup completo. Archivos creados:"
echo "   tailwind.config.js, index.html, .env"
echo "   src/index.css, src/main.jsx, src/App.jsx"
echo "   src/context/AuthContext.jsx"
echo "   src/api/api.js"
echo "   src/components/ProtectedRoute.jsx"
echo "   src/components/Sidebar.jsx"
echo "   src/components/Layout.jsx"
echo "   src/pages/Login.jsx + 7 placeholders"
echo ""
echo "👉 Siguiente paso: npm run dev"

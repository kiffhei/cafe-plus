import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import ShaderBackground from './ui/ShaderBackground'
import AISidebar from './AISidebar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const PAGE_TITLES = {
  '/pedido':      'Nuevo Pedido',
  '/pedidos-hoy': 'Pedidos del Día',
  '/historial':   'Historial de Pedidos',
  '/clientes':    'Clientes Plus',
  '/analisis':    'Análisis IA',
  '/productos':   'Gestión de Productos',
  '/usuarios':    'Gestión de Usuarios',
}

function ThemeToggle() {
  const { darkMode, toggleDark } = useTheme()
  return (
    <button
      onClick={toggleDark}
      title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium
                 transition-all duration-200
                 bg-white/10 text-white/70 border border-white/15
                 hover:bg-white/20 hover:text-white/90"
    >
      {darkMode ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l.71.71M6.34 6.34l-.71-.71M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
          </svg>
          <span className="hidden sm:inline">Claro</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
          <span className="hidden sm:inline">Oscuro</span>
        </>
      )}
    </button>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Café Plus'

  return (
    <div className="relative flex min-h-screen">

      {/* Fondo WebGL shader — temático y responsive */}
      <ShaderBackground />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <header className="cafe-sidebar-surface cafe-border-theme border-b sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden mr-1 p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-white/90 text-lg leading-tight">{title}</h1>
              <p className="text-white/40 text-xs mt-0.5">
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long',
                  timeZone: 'America/Mexico_City'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="text-right hidden sm:block ml-1">
              <p className="text-white/80 text-sm font-medium">{user?.nombre}</p>
              <p className="text-white/40 text-xs capitalize">{user?.categoria}</p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/20"
              style={{ background: 'var(--cafe-btn)', transition: 'background 0.8s ease' }}
            >
              <span className="text-white text-sm font-semibold">{user?.nombre?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </header>

        <main className="cafe-main-surface flex-1 p-4 sm:p-6 overflow-auto">
          <div className="animate-fade-up max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Panel flotante IA — visible en /analisis y /historial */}
      <AISidebar />
    </div>
  )
}

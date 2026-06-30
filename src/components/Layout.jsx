import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import ShaderBackground from './ui/ShaderBackground'
import AISidebar from './AISidebar'
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

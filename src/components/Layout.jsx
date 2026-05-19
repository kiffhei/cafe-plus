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

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
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
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-9 h-9 flex items-center justify-center rounded-lg
                 bg-crema-100 dark:bg-cafe-700
                 border border-cafe-200 dark:border-cafe-600
                 text-cafe-600 dark:text-crema-300
                 hover:bg-crema-200 dark:hover:bg-cafe-600
                 transition-all duration-200"
    >
      {dark ? (
        /* Sol — modo claro */
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l.71.71M6.34 6.34l-.71-.71M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
        </svg>
      ) : (
        /* Luna — modo oscuro */
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Café Plus'

  return (
    <div className="flex min-h-screen bg-crema-50 dark:bg-cafe-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-cafe-800 border-b border-cafe-100 dark:border-cafe-700 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h1 className="font-semibold text-cafe-800 dark:text-crema-100 text-lg leading-tight">{title}</h1>
            <p className="text-cafe-400 dark:text-cafe-400 text-xs mt-0.5">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long',
                timeZone: 'America/Mexico_City'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-cafe-700 dark:text-crema-200 text-sm font-medium">{user?.nombre}</p>
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

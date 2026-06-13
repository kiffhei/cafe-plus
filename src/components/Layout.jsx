import { useState, useRef, useEffect } from 'react'
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

const TEMAS = [
  { id: 'matcha',     label: 'Fresh Matcha', color: '#2d6a4f' },
  { id: 'cafe',       label: 'Café Oscuro',  color: '#6f4e37' },
  { id: 'medianoche', label: 'Medianoche',   color: '#6366f1' },
  { id: 'terracota',  label: 'Terracota',    color: '#c0622a' },
  { id: 'pizarra',    label: 'Pizarra',      color: '#475569' },
]

function ThemeToggle() {
  const { darkMode, toggleDark } = useTheme()
  return (
    <button
      onClick={toggleDark}
      title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-medium
                 transition-all duration-200 border
                 bg-cafe-800 text-crema-200 border-cafe-600 hover:bg-cafe-700
                 dark:bg-crema-200 dark:text-cafe-800 dark:border-crema-300 dark:hover:bg-crema-100"
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

function ThemeSelector() {
  const { tema, setTema, darkMode } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeTema = TEMAS.find(t => t.id === tema)
  const ringGap = darkMode ? '#0d2d1f' : '#ffffff'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Selector de paleta de color"
        aria-expanded={open}
        title="Cambiar paleta de color"
        className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-medium
                   transition-all duration-200 border
                   ${open
                     ? 'bg-cafe-700 text-crema-100 border-cafe-500 dark:bg-cafe-600 dark:text-crema-50 dark:border-cafe-500'
                     : 'bg-cafe-800 text-crema-200 border-cafe-600 hover:bg-cafe-700 dark:bg-crema-200 dark:text-cafe-800 dark:border-crema-300 dark:hover:bg-crema-100'
                   }`}
      >
        {/* Heroicons: swatch */}
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
          />
        </svg>
        <span className="hidden sm:inline truncate max-w-[80px]">
          {activeTema?.label ?? 'Tema'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-48
                     bg-white dark:bg-cafe-800
                     border border-cafe-100 dark:border-cafe-700
                     rounded-2xl shadow-warm-lg overflow-hidden
                     animate-fade-in"
        >
          <div className="px-3 pt-3 pb-2">
            <p className="text-cafe-400 dark:text-cafe-500 text-[10px] font-semibold uppercase tracking-widest">
              Paleta de color
            </p>
          </div>

          <div className="px-1.5 pb-1.5 flex flex-col gap-0.5">
            {TEMAS.map(t => {
              const isActive = tema === t.id
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => { setTema(t.id); setOpen(false) }}
                  className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left
                             transition-all duration-150
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-cafe-400
                             ${isActive
                               ? 'bg-cafe-50 dark:bg-cafe-700'
                               : 'hover:bg-cafe-50 dark:hover:bg-cafe-700/60'
                             }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: t.color,
                      transform: isActive ? 'scale(1.18)' : undefined,
                      boxShadow: isActive
                        ? `0 0 0 2px ${ringGap}, 0 0 0 3.5px ${t.color}`
                        : '0 1px 3px rgba(0,0,0,0.18)',
                    }}
                    aria-hidden="true"
                  />
                  <span className={`text-xs font-medium flex-1 ${
                    isActive
                      ? 'text-cafe-900 dark:text-crema-50'
                      : 'text-cafe-600 dark:text-cafe-300'
                  }`}>
                    {t.label}
                  </span>
                  {isActive && (
                    <svg className="w-3.5 h-3.5 shrink-0 text-cafe-500 dark:text-cafe-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Café Plus'

  return (
    <div className="flex min-h-screen bg-crema-50 dark:bg-cafe-900">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="header-glass sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden mr-1 p-2 rounded-lg text-cafe-600 dark:text-cafe-300
                         hover:bg-crema-100 dark:hover:bg-cafe-700 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-cafe-800 dark:text-crema-100 text-lg leading-tight">{title}</h1>
              <p className="text-cafe-400 text-xs mt-0.5">
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long',
                  timeZone: 'America/Mexico_City'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <ThemeToggle />
            <div className="text-right hidden sm:block ml-1">
              <p className="text-cafe-700 dark:text-crema-200 text-sm font-medium">{user?.nombre}</p>
              <p className="text-cafe-400 text-xs capitalize">{user?.categoria}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-cafe-500 flex items-center justify-center shrink-0">
              <span className="text-crema-100 text-sm font-semibold">{user?.nombre?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="animate-fade-up max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

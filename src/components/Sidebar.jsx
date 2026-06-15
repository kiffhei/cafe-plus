import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const TEMAS = [
  { id: 'matcha',      label: 'Fresh Matcha', accent: '#52b788', icon: '🌱' },
  { id: 'cafe-oscuro', label: 'Café Oscuro',  accent: '#d4a96a', icon: '☕' },
  { id: 'medianoche',  label: 'Medianoche',   accent: '#a78bfa', icon: '🌙' },
  { id: 'terracota',   label: 'Terracota',    accent: '#f4a460', icon: '🌅' },
  { id: 'pizarra',     label: 'Pizarra',      accent: '#a3e635', icon: '📋' },
  { id: 'vinyl-dark',  label: 'Dark Vinyl',   accent: '#d4a843', icon: '🎵' },
  { id: 'vinyl-light', label: 'Record Shop',  accent: '#d45c28', icon: '🎙️' },
]

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

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout, isAdmin } = useAuth()
  const { tema, setTema, darkMode } = useTheme()
  const navigate = useNavigate()
  const [temaOpen, setTemaOpen] = useState(false)

  function handleLogout() { logout(); navigate('/login') }

  const items = NAV_ITEMS.filter(i => i.roles.includes(user?.categoria))

  return (
    <aside className={`
      cafe-sidebar-surface cafe-border-theme
      fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
      flex flex-col text-crema-200 border-r
      transition-all duration-300 ease-in-out
      h-screen overflow-hidden shrink-0
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      ${collapsed ? 'w-16' : 'w-60'}
    `}>
      <div className="relative flex items-center gap-3 px-4 py-5 border-b border-cafe-700">
        <div className="w-8 h-8 rounded-lg bg-terracota-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">C+</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="font-semibold text-crema-100 text-sm leading-tight">Café Plus</p>
            <p className="text-cafe-400 text-xs">{isAdmin ? 'Administrador' : 'Cajero'}</p>
          </div>
        )}
        <button
          className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg
                     text-cafe-400 hover:text-crema-200 hover:bg-cafe-700 transition-colors"
          onClick={onMobileClose}
          aria-label="Cerrar menú"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
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
                `relative flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150
                ${isActive ? '' : 'text-cafe-300 hover:bg-white/[0.06] hover:text-crema-200'}
                ${collapsed ? 'justify-center' : ''}`
              }
              style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.12)' } : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-[20%] h-[60%] w-[3px] rounded-r-sm"
                      style={{ background: 'var(--cafe-accent)', transition: 'background 0.8s ease' }}
                    />
                  )}
                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                    style={isActive ? { color: 'var(--cafe-accent)', transition: 'color 0.8s ease' } : undefined}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {!collapsed && (
                    <span
                      className="text-sm font-medium whitespace-nowrap"
                      style={isActive ? { color: 'var(--cafe-accent)', transition: 'color 0.8s ease' } : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Selector de temas */}
      <div className="border-t cafe-border-theme pt-2 flex-shrink-0">
        <button
          onClick={() => setTemaOpen(prev => !prev)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors
            ${collapsed ? 'justify-center' : ''}`}
          title="Temas"
        >
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 border-white/20"
            style={{ background: 'var(--cafe-accent)', transition: 'background 0.8s ease' }}
          />
          {!collapsed && (
            <span className="text-xs text-white/55 whitespace-nowrap overflow-hidden">Temas</span>
          )}
        </button>

        {!collapsed && temaOpen && (
          <div className="flex flex-col gap-0.5 px-2 pb-1">
            {TEMAS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTema(t.id); setTemaOpen(false) }}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-colors
                  ${tema === t.id ? 'bg-white/10' : 'hover:bg-white/[0.06]'}`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                <span className="text-xs text-white/65 whitespace-nowrap">{t.label}</span>
                {tema === t.id && (
                  <span className="ml-auto text-xs cafe-accent-text">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-cafe-700 p-3 flex-shrink-0">
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium truncate"
               style={{ color: darkMode ? 'rgba(255,255,255,0.85)' : 'var(--cafe-accent)' }}>
              {user?.nombre}
            </p>
            <p className="text-xs truncate"
               style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
              {user?.usuario}
            </p>
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

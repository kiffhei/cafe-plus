import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

function renderSidebar(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/pedido']}>
      <Sidebar collapsed={false} onToggle={() => {}} mobileOpen={false} onMobileClose={() => {}} {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useTheme.mockReturnValue({ tema: 'matcha', setTema: vi.fn() })
})

describe('Sidebar', () => {
  it('un cajero ve las rutas comunes pero NO ve "Productos" ni la sección de Administración', () => {
    useAuth.mockReturnValue({
      user: { nombre: 'Lupe', usuario: 'lupe', categoria: 'cajero' },
      logout: vi.fn(),
      isAdmin: false,
    })
    renderSidebar()
    expect(screen.getByText('Nuevo Pedido')).toBeInTheDocument()
    expect(screen.getByText('Análisis IA')).toBeInTheDocument()
    expect(screen.queryByText('Productos')).not.toBeInTheDocument()
    expect(screen.queryByText('Administración')).not.toBeInTheDocument()
    expect(screen.getByText('Cajero')).toBeInTheDocument()
  })

  it('un admin ve además "Productos" bajo la sección de Administración', () => {
    useAuth.mockReturnValue({
      user: { nombre: 'Fany', usuario: 'fany', categoria: 'admin' },
      logout: vi.fn(),
      isAdmin: true,
    })
    renderSidebar()
    expect(screen.getByText('Productos')).toBeInTheDocument()
    expect(screen.getByText('Administración')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('al hacer clic en "Cerrar sesión" llama a logout()', () => {
    const logout = vi.fn()
    useAuth.mockReturnValue({
      user: { nombre: 'Lupe', usuario: 'lupe', categoria: 'cajero' },
      logout,
      isAdmin: false,
    })
    renderSidebar()
    fireEvent.click(screen.getByText('Cerrar sesión'))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('muestra el nombre y usuario de la sesión activa', () => {
    useAuth.mockReturnValue({
      user: { nombre: 'Lupe', usuario: 'lupe.cajero', categoria: 'cajero' },
      logout: vi.fn(),
      isAdmin: false,
    })
    renderSidebar()
    expect(screen.getByText('Lupe')).toBeInTheDocument()
    expect(screen.getByText('lupe.cajero')).toBeInTheDocument()
  })

  it('al abrir el selector de temas muestra la lista completa de 7 temas', () => {
    useAuth.mockReturnValue({
      user: { nombre: 'Lupe', usuario: 'lupe', categoria: 'cajero' },
      logout: vi.fn(),
      isAdmin: false,
    })
    renderSidebar()
    fireEvent.click(screen.getByTitle(/Tema: Fresh Matcha/))
    expect(screen.getByText('Café Oscuro')).toBeInTheDocument()
    expect(screen.getByText('Record Shop')).toBeInTheDocument()
  })

  it('seleccionar un tema del selector llama a setTema con el id correcto', () => {
    const setTema = vi.fn()
    useTheme.mockReturnValue({ tema: 'matcha', setTema })
    useAuth.mockReturnValue({
      user: { nombre: 'Lupe', usuario: 'lupe', categoria: 'cajero' },
      logout: vi.fn(),
      isAdmin: false,
    })
    renderSidebar()
    fireEvent.click(screen.getByTitle(/Tema: Fresh Matcha/))
    fireEvent.click(screen.getByText('Dark Vinyl'))
    expect(setTema).toHaveBeenCalledWith('vinyl-dark')
  })
})

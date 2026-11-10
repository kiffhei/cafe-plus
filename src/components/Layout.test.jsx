import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import { useAuth } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Sidebar y AISidebar tienen su propia suite — aquí se sustituyen por stubs
// para aislar la lógica propia de Layout (título por ruta, datos del usuario
// en el header, apertura del menú móvil).
vi.mock('./Sidebar', () => ({
  default: ({ mobileOpen }) => <div data-testid="sidebar-stub">{mobileOpen ? 'abierto' : 'cerrado'}</div>,
}))
vi.mock('./AISidebar', () => ({
  default: () => <div data-testid="ai-sidebar-stub" />,
}))

function renderLayout(path = '/pedido') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={<Layout />}>
            <Route index element={<div>contenido de la página</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { nombre: 'Brian', categoria: 'admin' } })
})

describe('Layout', () => {
  it('muestra el título mapeado para una ruta conocida', () => {
    renderLayout('/analisis')
    expect(screen.getByText('Análisis IA')).toBeInTheDocument()
  })

  it('cae en el título genérico "Café Plus" para una ruta sin mapeo', () => {
    renderLayout('/ruta-desconocida')
    expect(screen.getByText('Café Plus')).toBeInTheDocument()
  })

  it('muestra el nombre y la categoría del usuario autenticado en el header', () => {
    renderLayout('/pedido')
    expect(screen.getByText('Brian')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('renderiza el contenido de la ruta vía Outlet', () => {
    renderLayout('/pedido')
    expect(screen.getByText('contenido de la página')).toBeInTheDocument()
  })

  it('abre el menú móvil al pulsar el botón de hamburguesa', () => {
    renderLayout('/pedido')
    expect(screen.getByTestId('sidebar-stub')).toHaveTextContent('cerrado')
    fireEvent.click(screen.getByLabelText('Abrir menú'))
    expect(screen.getByTestId('sidebar-stub')).toHaveTextContent('abierto')
  })

  it('renderiza el panel de IA flotante', () => {
    renderLayout('/pedido')
    expect(screen.getByTestId('ai-sidebar-stub')).toBeInTheDocument()
  })
})

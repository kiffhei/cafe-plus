import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function renderProtected({ adminOnly = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route
          path="/privado"
          element={
            <ProtectedRoute adminOnly={adminOnly}>
              <div>contenido protegido</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>pantalla login</div>} />
        <Route path="/pedido" element={<div>pantalla pedido</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('muestra el loader mientras ready es false', () => {
    useAuth.mockReturnValue({ user: null, ready: false })
    renderProtected()
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('redirige a /login si no hay usuario autenticado', () => {
    useAuth.mockReturnValue({ user: null, ready: true })
    renderProtected()
    expect(screen.getByText('pantalla login')).toBeInTheDocument()
  })

  it('deja pasar a un cajero a una ruta sin adminOnly', () => {
    useAuth.mockReturnValue({ user: { categoria: 'cajero' }, ready: true })
    renderProtected({ adminOnly: false })
    expect(screen.getByText('contenido protegido')).toBeInTheDocument()
  })

  it('redirige a /pedido si un cajero entra a una ruta adminOnly', () => {
    useAuth.mockReturnValue({ user: { categoria: 'cajero' }, ready: true })
    renderProtected({ adminOnly: true })
    expect(screen.getByText('pantalla pedido')).toBeInTheDocument()
  })

  it('deja pasar a un admin a una ruta adminOnly', () => {
    useAuth.mockReturnValue({ user: { categoria: 'admin' }, ready: true })
    renderProtected({ adminOnly: true })
    expect(screen.getByText('contenido protegido')).toBeInTheDocument()
  })
})

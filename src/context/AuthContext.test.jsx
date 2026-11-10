import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { auth as authApi } from '../api/api'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../api/api', () => ({
  auth: { clerkExchange: vi.fn() },
}))

// Regresión INC-S13-K: una cuenta Clerk válida sin publicMetadata.categoria
// asignada debe recibir el mismo rol de default en todo el árbol de datos que
// consume (frontend Y lo que se persiste en localStorage, que es lo que lee
// Codigo.gs). No es una cuenta "bloqueada" a nivel app — el bloqueo real vive
// en Clerk (Access mode: Invite-only), pero el fallback sigue siendo 'cajero'
// y este test documenta ese comportamiento para que un cambio futuro sea
// intencional, no accidental.
function Sonda() {
  const { user, categoria, isAdmin, isCajero, ready } = useAuth()
  if (!ready) return <div>cargando</div>
  return (
    <div>
      <div data-testid="categoria">{categoria}</div>
      <div data-testid="isAdmin">{String(isAdmin)}</div>
      <div data-testid="isCajero">{String(isCajero)}</div>
      <div data-testid="nombre">{user?.nombre ?? 'sin-usuario'}</div>
    </div>
  )
}

function renderConProvider() {
  return render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useClerk.mockReturnValue({ signOut: vi.fn() })
  useClerkAuth.mockReturnValue({ getToken: vi.fn().mockResolvedValue('token-de-prueba') })
  authApi.clerkExchange.mockResolvedValue({ ok: true, data: { appToken: 'app-token-de-prueba' } })
})

describe('AuthContext', () => {
  it('sin usuario autenticado: user es null y ready queda en true', async () => {
    useUser.mockReturnValue({ user: null, isLoaded: true })
    renderConProvider()
    await waitFor(() => expect(screen.getByTestId('nombre')).toHaveTextContent('sin-usuario'))
  })

  it('usuario con categoria admin asignada en publicMetadata', async () => {
    useUser.mockReturnValue({
      user: {
        id: 'user_1', firstName: 'Fany', lastName: 'Tapia',
        publicMetadata: { categoria: 'admin' },
        primaryEmailAddress: { emailAddress: 'fany@cafeplus.mx' },
      },
      isLoaded: true,
    })
    renderConProvider()
    await waitFor(() => expect(screen.getByTestId('categoria')).toHaveTextContent('admin'))
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('true')
    expect(screen.getByTestId('isCajero')).toHaveTextContent('false')
  })

  it('usuario SIN categoria en publicMetadata cae al default cajero (INC-S13-K)', async () => {
    useUser.mockReturnValue({
      user: {
        id: 'user_2', firstName: 'Nuevo', lastName: 'Google',
        publicMetadata: {},
        primaryEmailAddress: { emailAddress: 'nuevo@gmail.com' },
      },
      isLoaded: true,
    })
    renderConProvider()
    await waitFor(() => expect(screen.getByTestId('categoria')).toHaveTextContent('cajero'))
    expect(screen.getByTestId('isCajero')).toHaveTextContent('true')
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false')
  })

  it('intercambia el token de Clerk por appToken y lo guarda en localStorage', async () => {
    useUser.mockReturnValue({
      user: {
        id: 'user_3', firstName: 'Brian', lastName: 'Anaya',
        publicMetadata: { categoria: 'admin' },
        primaryEmailAddress: { emailAddress: 'brian@cafeplus.mx' },
      },
      isLoaded: true,
    })
    renderConProvider()
    await waitFor(() => expect(authApi.clerkExchange).toHaveBeenCalledWith('token-de-prueba'))
    await waitFor(() => expect(localStorage.getItem('cafe_app_token')).toBe('app-token-de-prueba'))
  })

  it('si clerkExchange falla, limpia el appToken en vez de dejar uno viejo', async () => {
    authApi.clerkExchange.mockResolvedValue({ ok: false })
    localStorage.setItem('cafe_app_token', 'token-viejo-no-debe-quedar')
    useUser.mockReturnValue({
      user: {
        id: 'user_4', firstName: 'Cajero', lastName: 'Uno',
        publicMetadata: { categoria: 'cajero' },
        primaryEmailAddress: { emailAddress: 'cajero1@cafeplus.mx' },
      },
      isLoaded: true,
    })
    renderConProvider()
    await waitFor(() => expect(authApi.clerkExchange).toHaveBeenCalled())
    await waitFor(() => expect(localStorage.getItem('cafe_app_token')).toBeNull())
  })
})

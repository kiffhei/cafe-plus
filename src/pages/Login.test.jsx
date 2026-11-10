import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Login from './Login'
import { ThemeProvider } from '../context/ThemeContext'

// SignIn real de Clerk hace llamadas de red y requiere un ClerkProvider — se
// sustituye por un stub que expone las props recibidas para verificar la
// configuración (tema, ruta de redirección, modo de ruteo).
vi.mock('@clerk/clerk-react', () => ({
  SignIn: (props) => (
    <div data-testid="clerk-sign-in" data-after-sign-in-url={props.afterSignInUrl} data-routing={props.routing}>
      stub-sign-in
    </div>
  ),
}))

function renderLogin() {
  return render(
    <ThemeProvider>
      <Login />
    </ThemeProvider>
  )
}

describe('Login', () => {
  it('muestra el nombre de la marca Café+', () => {
    renderLogin()
    expect(screen.getByText('Café+')).toBeInTheDocument()
  })

  it('renderiza el formulario de SignIn de Clerk', () => {
    renderLogin()
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
  })

  it('configura SignIn para redirigir a la raíz tras iniciar sesión', () => {
    renderLogin()
    expect(screen.getByTestId('clerk-sign-in')).toHaveAttribute('data-after-sign-in-url', '/')
  })

  it('configura SignIn con ruteo por hash', () => {
    renderLogin()
    expect(screen.getByTestId('clerk-sign-in')).toHaveAttribute('data-routing', 'hash')
  })

  it('muestra el aviso de derechos reservados', () => {
    renderLogin()
    expect(screen.getByText(/Todos los derechos reservados/)).toBeInTheDocument()
  })
})

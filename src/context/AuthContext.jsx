import { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { auth as authApi } from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useClerkAuth()
  // GAS ya no confía en la categoria/id que mande el cliente — necesita un
  // appToken emitido tras verificar la sesión real de Clerk (clerkExchange).
  // ready espera ese intercambio para que las páginas no disparen fetches
  // con un appToken vacío y muestren un 401 fantasma en el primer render.
  const [tokenReady, setTokenReady] = useState(false)

  const ready = isLoaded && tokenReady

  const categoria = clerkUser?.publicMetadata?.categoria || 'cajero'

  const user = clerkUser
    ? {
        id_usuario:  clerkUser.id,
        nombre:      clerkUser.firstName ?? clerkUser.username ?? '',
        apellidos:   clerkUser.lastName ?? '',
        email:       clerkUser.primaryEmailAddress?.emailAddress ?? '',
        usuario:     clerkUser.username ?? clerkUser.primaryEmailAddress?.emailAddress ?? '',
        categoria,
      }
    : null

  const isAdmin  = categoria === 'admin'
  const isCajero = categoria === 'cajero'

  useEffect(() => {
    if (!isLoaded) return
    if (!clerkUser) {
      localStorage.removeItem('clerk_user_meta')
      localStorage.removeItem('cafe_user')
      localStorage.removeItem('cafe_app_token')
      setTokenReady(true)
      return
    }

    const meta = {
      id_usuario: clerkUser.id,
      nombre:     clerkUser.fullName ||
                  clerkUser.primaryEmailAddress?.emailAddress || '',
      usuario:    clerkUser.primaryEmailAddress?.emailAddress || '',
      categoria:  clerkUser.publicMetadata?.categoria || 'cajero',
    }
    localStorage.setItem('clerk_user_meta', JSON.stringify(meta))
    localStorage.setItem('cafe_user', JSON.stringify(meta))

    let cancelado = false
    setTokenReady(false)
    ;(async () => {
      try {
        const clerkToken = await getToken()
        const res = await authApi.clerkExchange(clerkToken)
        if (cancelado) return
        if (res.ok) localStorage.setItem('cafe_app_token', res.data.appToken)
        else localStorage.removeItem('cafe_app_token')
      } catch {
        if (!cancelado) localStorage.removeItem('cafe_app_token')
      } finally {
        if (!cancelado) setTokenReady(true)
      }
    })()

    return () => { cancelado = true }
    // getToken se omite a propósito: Clerk no garantiza que sea una referencia
    // estable entre renders, e incluirla causa un loop de clerkExchange en cada
    // render (confirmado con harness — cada setTokenReady(false) generaba una
    // nueva referencia y volvía a disparar el efecto).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, clerkUser])

  function logout() {
    localStorage.removeItem('cafe_app_token')
    signOut()
  }

  return (
    <AuthContext.Provider value={{ user, categoria, isAdmin, isCajero, logout, ready }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

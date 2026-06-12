import { createContext, useContext, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useClerk()

  const ready = isLoaded

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
    if (clerkUser) {
      const meta = {
        id_usuario: clerkUser.id,
        nombre:     clerkUser.fullName ||
                    clerkUser.primaryEmailAddress?.emailAddress || '',
        usuario:    clerkUser.primaryEmailAddress?.emailAddress || '',
        categoria:  clerkUser.publicMetadata?.categoria || 'cajero',
      }
      localStorage.setItem('clerk_user_meta', JSON.stringify(meta))
      localStorage.setItem('cafe_user', JSON.stringify(meta))
    } else {
      localStorage.removeItem('clerk_user_meta')
      localStorage.removeItem('cafe_user')
    }
  }, [isLoaded, clerkUser])

  function logout() {
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

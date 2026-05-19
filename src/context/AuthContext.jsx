import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [token, setToken] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem('cafe_token')
    const savedUser  = localStorage.getItem('cafe_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setReady(true)
  }, [])

  function login(userData, userToken) {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('cafe_token', userToken)
    localStorage.setItem('cafe_user',  JSON.stringify(userData))
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('cafe_token')
    localStorage.removeItem('cafe_user')
  }

  const isAdmin  = user?.categoria === 'admin'
  const isCajero = user?.categoria === 'cajero'

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isCajero, ready }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

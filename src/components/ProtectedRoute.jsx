import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, ready } = useAuth()

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-crema-50">
      <div className="text-cafe-500 text-sm animate-pulse">Cargando...</div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.categoria !== 'admin') return <Navigate to="/pedido" replace />

  return children
}

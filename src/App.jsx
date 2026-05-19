import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout      from './components/Layout'
import Login       from './pages/Login'
import NuevoPedido from './pages/NuevoPedido'
import PedidosHoy  from './pages/PedidosHoy'
import Historial   from './pages/Historial'
import Clientes    from './pages/Clientes'
import Analisis    from './pages/Analisis'
import Productos   from './pages/Productos'
import Usuarios    from './pages/Usuarios'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/pedido" replace />} />
            <Route path="pedido"      element={<NuevoPedido />} />
            <Route path="pedidos-hoy" element={<PedidosHoy />} />
            <Route path="historial"   element={<Historial />} />
            <Route path="clientes"    element={<Clientes />} />
            <Route path="analisis"    element={<Analisis />} />
            <Route path="productos"   element={<ProtectedRoute adminOnly><Productos /></ProtectedRoute>} />
            <Route path="usuarios"    element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

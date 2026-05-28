import { useState, useEffect, useCallback } from 'react'
import { pedidos as pedidosApi, formatMXN, formatFechaHora, canalBadge, estadoBadge } from '../api/api'

const ESTADOS = ['pendiente', 'preparacion', 'entregado', 'cancelado']

function TarjetaPedido({ pedido, onCambiarEstado, cargando }) {
  const canal  = canalBadge(pedido.canal)
  const estado = estadoBadge(pedido.estado)
  const items  = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : (pedido.items || [])

  return (
    <div className={`bg-white dark:bg-cafe-800 rounded-xl border shadow-sm transition-all
      ${pedido.estado === 'pendiente'   ? 'border-yellow-300 dark:border-yellow-700' : ''}
      ${pedido.estado === 'preparacion' ? 'border-blue-300 dark:border-blue-700' : ''}
      ${pedido.estado === 'entregado'   ? 'border-green-200 dark:border-green-800' : ''}
      ${pedido.estado === 'cancelado'   ? 'border-red-200 dark:border-red-800 opacity-60' : ''}
      ${!['pendiente','preparacion','entregado','cancelado'].includes(pedido.estado) ? 'border-cafe-100 dark:border-cafe-700' : ''}
    `}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-cafe-100 dark:border-cafe-700">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-cafe-500 dark:text-cafe-400">#{pedido.id_pedido}</span>
          <span className={canal.cls}>{canal.label}</span>
          {pedido.nombre_cliente && (
            <span className="text-xs text-cafe-600 dark:text-cafe-300 font-medium">· {pedido.nombre_cliente}</span>
          )}
        </div>
        <span className={estado.cls}>{estado.label}</span>
      </div>

      {/* Items */}
      <div className="px-4 py-3">
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span className="text-cafe-700 dark:text-crema-200">
                <span className="font-medium">{item.cantidad}×</span> {item.nombre_producto}
                {item.notas_producto && <span className="text-cafe-400 text-xs ml-1">({item.notas_producto})</span>}
              </span>
              <span className="text-cafe-500 dark:text-cafe-400 ml-2 shrink-0">{formatMXN(item.precio_unitario * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        {pedido.notas && (
          <p className="mt-2 text-xs text-cafe-400 italic">📝 {pedido.notas}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-cafe-800 dark:text-crema-100">{formatMXN(pedido.total)}</p>
          <p className="text-xs text-cafe-400">{formatFechaHora(pedido.fecha_hora)}</p>
        </div>

        {/* Cambio de estado */}
        {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
          <div className="flex gap-2">
            {pedido.estado === 'pendiente' && (
              <button
                onClick={() => onCambiarEstado(pedido.id_pedido, 'preparacion')}
                disabled={cargando === pedido.id_pedido}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50">
                En preparación →
              </button>
            )}
            {pedido.estado === 'preparacion' && (
              <button
                onClick={() => onCambiarEstado(pedido.id_pedido, 'entregado')}
                disabled={cargando === pedido.id_pedido}
                className="px-3 py-1.5 bg-olivo-500 hover:bg-olivo-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50">
                Entregar ✓
              </button>
            )}
            <button
              onClick={() => onCambiarEstado(pedido.id_pedido, 'cancelado')}
              disabled={cargando === pedido.id_pedido}
              className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg transition-all disabled:opacity-50">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PedidosHoy() {
  const [pedidos, setPedidos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [cargando, setCargando] = useState(null)
  const [filtro, setFiltro]     = useState('todos')
  const [error, setError]       = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("/").reverse().join("-")
    const res = await pedidosApi.getAll({ fecha_desde: hoy, fecha_hasta: hoy, sin_detalle: 'true' })
    if (res.ok) setPedidos(res.data)
    else setError('Error cargando pedidos')
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Recargar al volver a la página (desde Nuevo Pedido u otra sección)
  useEffect(() => {
    const onFocus    = () => cargar()
    const onVisible  = () => { if (document.visibilityState === 'visible') cargar() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [cargar])

  // Auto-refresh cada 30s
  useEffect(() => {
    const id = setInterval(cargar, 30000)
    return () => clearInterval(id)
  }, [cargar])

  async function cambiarEstado(idPedido, nuevoEstado) {
    setCargando(idPedido)
    const res = await pedidosApi.updateEstado(idPedido, nuevoEstado)
    if (res.ok) {
      setPedidos(p => p.map(pd =>
        pd.id_pedido === idPedido ? { ...pd, estado: nuevoEstado } : pd
      ))
    }
    setCargando(null)
  }

  const filtrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.estado === filtro)

  // Métricas
  const pendientes   = pedidos.filter(p => p.estado === 'pendiente').length
  const preparacion  = pedidos.filter(p => p.estado === 'preparacion').length
  const entregados   = pedidos.filter(p => p.estado === 'entregado').length
  const totalVentas  = pedidos.filter(p => p.estado === 'entregado').reduce((s, p) => s + parseFloat(p.total || 0), 0)

  return (
    <div>
      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pendientes',  value: pendientes,  color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
          { label: 'En prep.',    value: preparacion, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          { label: 'Entregados',  value: entregados,  color: 'text-olivo-600 dark:text-olivo-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
          { label: 'Venta del día', value: formatMXN(totalVentas), color: 'text-terracota-500', bg: 'bg-crema-100 dark:bg-cafe-800 border-cafe-200 dark:border-cafe-700' },
        ].map(m => (
          <div key={m.label} className={`rounded-xl border p-4 ${m.bg}`}>
            <p className="text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + Refresh */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {['todos', ...ESTADOS].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${filtro === e
                  ? 'bg-cafe-700 text-crema-100'
                  : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300'}`}>
              {e === 'todos' ? 'Todos' : estadoBadge(e).label}
              {e !== 'todos' && (
                <span className="ml-1.5 text-cafe-400">
                  ({pedidos.filter(p => p.estado === e).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all disabled:opacity-50">
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-cafe-400">
          <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3"/>
          Cargando pedidos del día...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">☕</p>
          <p className="text-cafe-500 dark:text-cafe-400 font-medium">
            {filtro === 'todos' ? 'Sin pedidos hoy todavía' : `No hay pedidos en estado "${estadoBadge(filtro).label}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(p => (
            <TarjetaPedido key={p.id_pedido} pedido={p}
              onCambiarEstado={cambiarEstado} cargando={cargando} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { pedidos as pedidosApi, formatMXN, formatFechaHora, canalBadge, estadoBadge } from '../api/api'
import { useAuth } from '../context/AuthContext'

const CANALES = ['local','didi','rappi','ubereats']
const ESTADOS = ['pendiente','preparacion','entregado','cancelado']

function ModalDetalle({ pedido, onClose }) {
  if (!pedido) return null
  const items = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : (pedido.items || [])
  const canal  = canalBadge(pedido.canal)
  const estado = estadoBadge(pedido.estado)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-cafe-800 rounded-2xl shadow-warm-lg w-full max-w-md border border-cafe-100 dark:border-cafe-700 animate-fade-in"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-cafe-100 dark:border-cafe-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-cafe-800 dark:text-crema-100">
              Pedido <span className="font-mono">#{pedido.id_pedido}</span>
            </h3>
            <p className="text-xs text-cafe-400 mt-0.5">{formatFechaHora(pedido.fecha_hora)}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-cafe-400 hover:text-cafe-700 dark:hover:text-crema-200 hover:bg-crema-100 dark:hover:bg-cafe-700 transition-all">
            ✕
          </button>
        </div>

        {/* Info */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={canal.cls}>{canal.label}</span>
            <span className={estado.cls}>{estado.label}</span>
            {pedido.nombre_cliente && (
              <span className="text-xs text-cafe-600 dark:text-cafe-300 font-medium bg-crema-100 dark:bg-cafe-700 px-2 py-0.5 rounded-full">
                👤 {pedido.nombre_cliente}
              </span>
            )}
          </div>
          <p className="text-xs text-cafe-500 dark:text-cafe-400">Cajero: <span className="font-medium">{pedido.nombre_cajero}</span></p>

          {/* Items */}
          <div className="bg-crema-50 dark:bg-cafe-900/50 rounded-xl p-3 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <div>
                  <span className="font-medium text-cafe-700 dark:text-crema-200">{item.cantidad}× {item.nombre_producto}</span>
                  {item.notas_producto && (
                    <p className="text-xs text-cafe-400 italic">{item.notas_producto}</p>
                  )}
                </div>
                <span className="text-cafe-600 dark:text-cafe-400 ml-3 shrink-0">{formatMXN(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
          </div>

          {pedido.notas && (
            <p className="text-xs text-cafe-400 italic bg-crema-50 dark:bg-cafe-900/50 rounded-lg px-3 py-2">📝 {pedido.notas}</p>
          )}
        </div>

        {/* Totales */}
        <div className="px-6 py-4 border-t border-cafe-100 dark:border-cafe-700 space-y-1.5">
          <div className="flex justify-between text-sm text-cafe-600 dark:text-cafe-400">
            <span>Subtotal</span><span>{formatMXN(pedido.subtotal)}</span>
          </div>
          {parseFloat(pedido.descuento) > 0 && (
            <div className="flex justify-between text-sm text-olivo-600 dark:text-olivo-400">
              <span>Descuento</span><span>−{formatMXN(pedido.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-cafe-800 dark:text-crema-100 pt-1 border-t border-cafe-100 dark:border-cafe-700">
            <span>Total</span>
            <span className="text-terracota-500">{formatMXN(pedido.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Historial() {
  const { user }       = useAuth()
  const isAdmin        = user?.categoria === 'admin'

  const [pedidos, setPedidos]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [detalle, setDetalle]       = useState(null)
  const [pagina, setPagina]         = useState(1)
  const POR_PAGINA = 15

  // Filtros
  const hoy = new Date().toISOString().split('T')[0]
  const haceMes = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]
  const [filtros, setFiltros] = useState({
    fecha_desde: haceMes,
    fecha_hasta: hoy,
    canal:       '',
    estado:      '',
    buscar:      '',
  })

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    const params = { ...filtros }
    if (!isAdmin) params.id_cajero = user?.id_usuario
    const res = await pedidosApi.getAll(params)
    if (res.ok) { setPedidos(res.data); setPagina(1) }
    else setError('Error cargando historial')
    setLoading(false)
  }, [filtros, isAdmin, user])

  useEffect(() => { cargar() }, [cargar])

  function setFiltro(key, val) {
    setFiltros(f => ({ ...f, [key]: val }))
  }

  // Filtro local por búsqueda
  const pedidosFiltrados = pedidos.filter(p => {
    if (!filtros.buscar) return true
    const q = filtros.buscar.toLowerCase()
    return (
      String(p.id_pedido).includes(q) ||
      (p.nombre_cliente || '').toLowerCase().includes(q) ||
      (p.nombre_cajero || '').toLowerCase().includes(q)
    )
  })

  // Paginación
  const total     = pedidosFiltrados.length
  const totalPags = Math.ceil(total / POR_PAGINA)
  const pagActual = pedidosFiltrados.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA)

  // KPIs del rango filtrado
  const ventasTotal    = pedidos.filter(p => p.estado === 'entregado').reduce((s, p) => s + parseFloat(p.total || 0), 0)
  const ticketPromedio = pedidos.filter(p => p.estado === 'entregado').length
    ? ventasTotal / pedidos.filter(p => p.estado === 'entregado').length
    : 0

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total pedidos',   value: total,                       sub: 'en el rango', color: 'text-cafe-700 dark:text-crema-200' },
          { label: 'Entregados',      value: pedidos.filter(p=>p.estado==='entregado').length, sub: 'completados', color: 'text-olivo-600 dark:text-olivo-400' },
          { label: 'Venta del rango', value: formatMXN(ventasTotal),      sub: 'solo entregados', color: 'text-terracota-500' },
          { label: 'Ticket promedio', value: formatMXN(ticketPromedio),   sub: 'por pedido', color: 'text-cafe-700 dark:text-crema-200' },
        ].map(k => (
          <div key={k.label} className="card">
            <p className="text-xs font-medium text-cafe-400 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-cafe-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Desde</label>
            <input type="date" value={filtros.fecha_desde}
              onChange={e => setFiltro('fecha_desde', e.target.value)}
              className="input-cafe text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Hasta</label>
            <input type="date" value={filtros.fecha_hasta}
              onChange={e => setFiltro('fecha_hasta', e.target.value)}
              className="input-cafe text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Canal</label>
            <select value={filtros.canal} onChange={e => setFiltro('canal', e.target.value)}
              className="input-cafe text-sm">
              <option value="">Todos los canales</option>
              {CANALES.map(c => <option key={c} value={c}>{canalBadge(c).label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)}
              className="input-cafe text-sm">
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{estadoBadge(e).label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <input value={filtros.buscar} onChange={e => setFiltro('buscar', e.target.value)}
            placeholder="Buscar por folio, cliente o cajero..."
            className="input-cafe text-sm flex-1" />
          <button onClick={cargar} disabled={loading}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shrink-0">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            }
            Buscar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cafe-400">
            <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3"/>
            Cargando historial...
          </div>
        ) : pagActual.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-cafe-500 dark:text-cafe-400 font-medium">Sin pedidos en el rango seleccionado</p>
          </div>
        ) : (
          <>
            {/* Header tabla */}
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_0.8fr_auto] gap-4 px-5 py-3 bg-crema-50 dark:bg-cafe-900/50 border-b border-cafe-100 dark:border-cafe-700 text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide">
              <span>Folio</span>
              <span>Fecha/hora</span>
              <span>Canal</span>
              <span>Cliente</span>
              <span>Cajero</span>
              <span className="text-right">Total</span>
              <span>Estado</span>
            </div>

            {/* Rows */}
            {pagActual.map((p, i) => {
              const canal  = canalBadge(p.canal)
              const estado = estadoBadge(p.estado)
              return (
                <div key={p.id_pedido}
                  onClick={() => setDetalle(p)}
                  className={`grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_0.8fr_auto] gap-1 sm:gap-4 px-5 py-3.5 cursor-pointer hover:bg-crema-50 dark:hover:bg-cafe-700/50 transition-colors
                    ${i < pagActual.length - 1 ? 'border-b border-cafe-100 dark:border-cafe-700' : ''}`}>
                  <span className="font-mono text-xs text-cafe-500 dark:text-cafe-400">#{p.id_pedido}</span>
                  <span className="text-sm text-cafe-700 dark:text-crema-200">{formatFechaHora(p.fecha_hora)}</span>
                  <span><span className={canal.cls}>{canal.label}</span></span>
                  <span className="text-sm text-cafe-600 dark:text-cafe-300 truncate">{p.nombre_cliente || <span className="text-cafe-300 dark:text-cafe-600">—</span>}</span>
                  <span className="text-sm text-cafe-600 dark:text-cafe-300 truncate">{p.nombre_cajero}</span>
                  <span className="text-sm font-semibold text-cafe-800 dark:text-crema-100 sm:text-right">{formatMXN(p.total)}</span>
                  <span><span className={estado.cls}>{estado.label}</span></span>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Paginación */}
      {totalPags > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-cafe-400">
            Mostrando {(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA, total)} de {total} pedidos
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 disabled:opacity-40 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all">
              ← Anterior
            </button>
            {Array.from({ length: Math.min(5, totalPags) }, (_, i) => {
              const num = pagina <= 3 ? i+1 : pagina - 2 + i
              if (num < 1 || num > totalPags) return null
              return (
                <button key={num} onClick={() => setPagina(num)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${pagina === num
                      ? 'bg-cafe-700 text-crema-100'
                      : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
                  {num}
                </button>
              )
            })}
            <button onClick={() => setPagina(p => Math.min(totalPags, p+1))} disabled={pagina === totalPags}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 disabled:opacity-40 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && <ModalDetalle pedido={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}

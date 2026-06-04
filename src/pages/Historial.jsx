import { useState, useEffect, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import {
  pedidos as pedidosApi,
  usuarios as usuariosApi,
  formatMXN,
  formatFecha,
  canalBadge,
  estadoBadge,
  generarMeses,
} from '../api/api'
import { useAuth } from '../context/AuthContext'

const MESES = generarMeses()

const CANALES   = ['local', 'didi', 'rappi', 'ubereats']
const ESTADOS   = ['pendiente', 'preparacion', 'entregado', 'cancelado']
const POR_PAGINA = 10

// ── Helpers de ordenamiento ──────────────────────────────────────

function ThSort({ children, campo, sortState, onSort, className = '' }) {
  const activo = sortState.campo === campo
  return (
    <th
      onClick={() => onSort(campo)}
      className={`px-4 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide
                  cursor-pointer select-none hover:text-cafe-700 dark:hover:text-crema-300
                  transition-colors group ${className}`}
    >
      <span className="flex items-center gap-1">
        {children}
        <span className={`text-[10px] leading-none transition-opacity
          ${activo ? 'opacity-100 text-cafe-700 dark:text-crema-200' : 'opacity-30 group-hover:opacity-60'}`}>
          {activo ? (sortState.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

function extraerNumero(id) {
  if (!id) return 0
  const solo = String(id).replace(/\D/g, '')
  return solo ? parseInt(solo, 10) : 0
}

function aplicarOrden(lista, { campo, dir }) {
  return [...lista].sort((a, b) => {
    let va, vb
    if (campo === 'id_pedido') {
      va = extraerNumero(a.id_pedido)
      vb = extraerNumero(b.id_pedido)
    } else if (campo === 'fecha_hora') {
      va = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
      vb = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
    } else if (campo === 'total') {
      va = parseFloat(a.total) || 0
      vb = parseFloat(b.total) || 0
    } else if (campo === 'estado') {
      const ord = { pendiente: 0, preparacion: 1, entregado: 2, cancelado: 3 }
      va = ord[a.estado] ?? 9
      vb = ord[b.estado] ?? 9
    } else {
      return 0
    }
    return dir === 'asc' ? va - vb : vb - va
  })
}

// ── Helpers ──────────────────────────────────────────────────────

function fechaHoyMX() {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('/').reverse().join('-')
}

function fechaHaceDiasMX(dias) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() - dias * 24 * 60 * 60 * 1000))
    .split('/').reverse().join('-')
}

function parseItems(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

// ── Ticket PDF ───────────────────────────────────────────────────

function generarTicketPDF(pedido) {
  const doc  = new jsPDF({ unit: 'mm', format: [80, 160] })
  const cafe = '#8B4513'
  const gris = '#555555'
  const items = parseItems(pedido.items)

  doc.setFontSize(18)
  doc.setTextColor(cafe)
  doc.text('CAFÉ+', 40, 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(gris)
  doc.text('─'.repeat(38), 5, 16)

  doc.setFontSize(9)
  doc.text(`Ticket: ${pedido.id_pedido}`,                              5, 21)
  doc.text(`Fecha:  ${formatFecha(pedido.fecha_hora)}`,                5, 26)
  doc.text(`Cajero: ${pedido.nombre_cajero || '—'}`,                   5, 31)
  doc.text(`Canal:  ${canalBadge(pedido.canal).label}`,                5, 36)
  doc.text(`Cliente: ${pedido.nombre_cliente || 'Público general'}`,   5, 41)
  doc.text('─'.repeat(38), 5, 45)

  let y = 50
  items.forEach(item => {
    const linea = `${item.cantidad}x ${item.nombre_producto}`
    const precio = formatMXN(item.precio_unitario * item.cantidad)
    doc.text(linea.substring(0, 32), 5, y)
    doc.text(precio, 75, y, { align: 'right' })
    y += 5
  })

  doc.text('─'.repeat(38), 5, y); y += 5
  doc.text(`Subtotal: ${formatMXN(pedido.subtotal)}`, 5, y); y += 5

  if (parseFloat(pedido.descuento) > 0) {
    doc.setTextColor('#6B7C3D')
    doc.text(`Descuento: -${formatMXN(pedido.descuento)}`, 5, y); y += 5
    doc.setTextColor(gris)
  }

  doc.setFontSize(11)
  doc.setTextColor(cafe)
  doc.text(`TOTAL: ${formatMXN(pedido.total)}`, 5, y); y += 8

  doc.setFontSize(8)
  doc.setTextColor(gris)
  doc.text('¡Gracias por tu visita!',          40, y, { align: 'center' }); y += 4
  doc.text('Café+ · Cuautitlán, EdoMex',       40, y, { align: 'center' })

  doc.save(`ticket-${pedido.id_pedido}.pdf`)
}

// ── Modal detalle ────────────────────────────────────────────────

function ModalDetalle({ pedido, onClose, onTicket }) {
  if (!pedido) return null
  const items  = parseItems(pedido.items)
  const canal  = canalBadge(pedido.canal)
  const estado = estadoBadge(pedido.estado)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-cafe-800 rounded-2xl shadow-warm-lg
                   w-full max-w-md max-h-[90vh] overflow-y-auto
                   border border-cafe-100 dark:border-cafe-700 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-cafe-100 dark:border-cafe-700 flex items-center justify-between sticky top-0 bg-white dark:bg-cafe-800 z-10">
          <div>
            <h3 className="font-semibold text-cafe-800 dark:text-crema-100">
              Pedido <span className="font-mono">#{pedido.id_pedido}</span>
            </h3>
            <p className="text-xs text-cafe-400 mt-0.5">
              {pedido.fecha_hora && pedido.fecha_hora !== '' ? formatFecha(pedido.fecha_hora) : '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-cafe-400 hover:text-cafe-700 dark:hover:text-crema-200
                       hover:bg-crema-100 dark:hover:bg-cafe-700 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Info */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={canal.cls}>{canal.label}</span>
            <span className={estado.cls}>{estado.label}</span>
            {pedido.nombre_cliente && (
              <span className="text-xs text-cafe-600 dark:text-cafe-300 font-medium bg-crema-100 dark:bg-cafe-700 px-2 py-0.5 rounded-full">
                👤 {pedido.nombre_cliente}
              </span>
            )}
          </div>
          <p className="text-xs text-cafe-500 dark:text-cafe-400">
            Cajero: <span className="font-medium">{pedido.nombre_cajero || '—'}</span>
          </p>

          {/* Tabla de productos */}
          <div className="rounded-xl border border-cafe-100 dark:border-cafe-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-crema-50 dark:bg-cafe-900/50 border-b border-cafe-100 dark:border-cafe-700">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-cafe-500 uppercase">Producto</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-cafe-500 uppercase">Cant.</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-cafe-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-cafe-100 dark:border-cafe-700 last:border-0">
                    <td className="px-3 py-2 text-cafe-700 dark:text-crema-200">
                      {item.nombre_producto}
                      {item.notas_producto && (
                        <p className="text-xs text-cafe-400 italic">{item.notas_producto}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-cafe-600 dark:text-cafe-300">
                      {item.cantidad}
                    </td>
                    <td className="px-3 py-2 text-right text-cafe-600 dark:text-cafe-300">
                      {formatMXN(item.precio_unitario * item.cantidad)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pedido.notas && (
            <p className="text-xs text-cafe-400 italic bg-crema-50 dark:bg-cafe-900/50 rounded-lg px-3 py-2">
              📝 {pedido.notas}
            </p>
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

        {/* Botón ticket */}
        <div className="px-6 pb-5">
          <button
            onClick={() => onTicket(pedido)}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Descargar Ticket PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────

export default function Historial() {
  const { user, isAdmin } = useAuth()

  const [pedidos, setPedidos]   = useState([])
  const [cajeros, setCajeros]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [detalle, setDetalle]   = useState(null)
  const [pagina, setPagina]     = useState(1)
  const [orden, setOrden]       = useState({ campo: 'id_pedido', dir: 'desc' })
  const [mesSel, setMesSel]     = useState('')

  function toggleOrden(campo) {
    setOrden(o => ({
      campo,
      dir: o.campo === campo && o.dir === 'desc' ? 'asc' : 'desc',
    }))
    setPagina(1)
  }

  const [filtros, setFiltros] = useState({
    fecha_desde: fechaHaceDiasMX(30),
    fecha_hasta: fechaHoyMX(),
    id_cajero:   '',
    canal:       '',
    estado:      '',
    buscar:      '',
  })

  // Cargar lista de cajeros para el filtro (solo admin)
  useEffect(() => {
    if (!isAdmin) return
    usuariosApi.getAll().then(res => {
      if (res.ok) setCajeros(res.data.filter(u => u.activo))
    }).catch(() => {})
  }, [isAdmin])

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {
        fecha_desde: filtros.fecha_desde,
        fecha_hasta: filtros.fecha_hasta,
      }
      if (filtros.canal)   params.canal   = filtros.canal
      if (filtros.estado)  params.estado  = filtros.estado
      // Cajero: admin puede filtrar; cajero siempre ve solo los suyos
      if (isAdmin && filtros.id_cajero) params.id_cajero = filtros.id_cajero
      if (!isAdmin) params.id_cajero = user?.id_usuario

      const res = await pedidosApi.getAll(params)
      if (res.ok) { setPedidos(res.data); setPagina(1) }
      else setError(`Error: ${res.message || 'respuesta inválida del servidor'}`)
    } catch (err) {
      setError(`Error de conexión: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [filtros.fecha_desde, filtros.fecha_hasta, filtros.canal, filtros.estado,
      filtros.id_cajero, isAdmin, user])

  useEffect(() => { cargar() }, [cargar])

  function setFiltro(key, val) {
    setFiltros(f => ({ ...f, [key]: val }))
    if (key === 'fecha_desde' || key === 'fecha_hasta') setMesSel('')
  }

  function seleccionarMes(desde) {
    if (!desde) { setMesSel(''); return }
    const mes = MESES.find(m => m.desde === desde)
    if (!mes) return
    setMesSel(desde)
    setFiltros(f => ({ ...f, fecha_desde: mes.desde, fecha_hasta: mes.hasta }))
  }

  // Filtro local por búsqueda de texto
  const pedidosFiltrados = pedidos.filter(p => {
    if (!filtros.buscar) return true
    const q = filtros.buscar.toLowerCase()
    return (
      String(p.id_pedido).includes(q) ||
      (p.nombre_cliente || '').toLowerCase().includes(q) ||
      (p.nombre_cajero  || '').toLowerCase().includes(q)
    )
  })

  // Ordenamiento + paginación
  const pedidosOrdenados = aplicarOrden(pedidosFiltrados, orden)
  const totalRegistros = pedidosOrdenados.length
  const totalPaginas   = Math.max(1, Math.ceil(totalRegistros / POR_PAGINA))
  const paginaSegura   = Math.min(pagina, totalPaginas)
  const registrosPag   = pedidosOrdenados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  )

  // KPIs
  const entregados     = pedidos.filter(p => p.estado === 'entregado')
  const ventasTotal    = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)
  const ticketPromedio = entregados.length ? ventasTotal / entregados.length : 0

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total pedidos',   value: totalRegistros,           sub: 'en el rango',    color: 'text-cafe-700 dark:text-crema-200' },
          { label: 'Entregados',      value: entregados.length,        sub: 'completados',    color: 'text-olivo-600 dark:text-olivo-400' },
          { label: 'Venta del rango', value: formatMXN(ventasTotal),   sub: 'solo entregados',color: 'text-terracota-500' },
          { label: 'Ticket promedio', value: formatMXN(ticketPromedio),sub: 'por pedido',     color: 'text-cafe-700 dark:text-crema-200' },
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
        {/* Selector de mes rápido */}
        <div className="mb-3">
          <select
            value={mesSel}
            onChange={e => seleccionarMes(e.target.value)}
            className="input-cafe text-sm w-full sm:w-64"
          >
            <option value="">Todos los meses / Personalizado</option>
            {MESES.map(m => (
              <option key={m.desde} value={m.desde}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Desde</label>
            <input type="date" value={filtros.fecha_desde}
              onChange={e => setFiltro('fecha_desde', e.target.value)}
              className="input-cafe text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Hasta</label>
            <input type="date" value={filtros.fecha_hasta}
              onChange={e => setFiltro('fecha_hasta', e.target.value)}
              className="input-cafe text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Canal</label>
            <select value={filtros.canal} onChange={e => setFiltro('canal', e.target.value)}
              className="input-cafe text-sm w-full">
              <option value="">Todos los canales</option>
              {CANALES.map(c => (
                <option key={c} value={c}>{canalBadge(c).label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)}
              className="input-cafe text-sm w-full">
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => (
                <option key={e} value={e}>{estadoBadge(e).label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtro cajero — solo admin */}
          {isAdmin && (
            <div className="sm:w-48 shrink-0">
              <select value={filtros.id_cajero} onChange={e => setFiltro('id_cajero', e.target.value)}
                className="input-cafe text-sm w-full">
                <option value="">Todos los cajeros</option>
                {cajeros.map(u => (
                  <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellidos}</option>
                ))}
              </select>
            </div>
          )}
          <input
            value={filtros.buscar}
            onChange={e => setFiltro('buscar', e.target.value)}
            placeholder="Buscar por folio, cliente o cajero..."
            className="input-cafe text-sm flex-1"
          />
          <button onClick={cargar} disabled={loading}
            className="btn-primary px-5 py-2 text-sm flex items-center justify-center gap-2 shrink-0">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            }
            Buscar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="table-wrapper">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cafe-400">
            <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3" />
            Cargando historial...
          </div>
        ) : registrosPag.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-cafe-500 dark:text-cafe-400 font-medium">
              Sin pedidos en el rango seleccionado
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-crema-50 dark:bg-cafe-900/50 border-b border-cafe-100 dark:border-cafe-700">
                <ThSort campo="id_pedido" sortState={orden} onSort={toggleOrden} className="text-left">#</ThSort>
                <ThSort campo="fecha_hora" sortState={orden} onSort={toggleOrden} className="text-left">Fecha</ThSort>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Cajero</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Canal</th>
                <th className="hidden md:table-cell text-center px-4 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Productos</th>
                <th className="hidden md:table-cell text-right px-4 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Descuento</th>
                <ThSort campo="total" sortState={orden} onSort={toggleOrden} className="text-right">Total</ThSort>
                <ThSort campo="estado" sortState={orden} onSort={toggleOrden} className="hidden sm:table-cell text-left">Estado</ThSort>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {registrosPag.map((p, i) => {
                const canal  = canalBadge(p.canal)
                const estado = estadoBadge(p.estado)
                const items  = parseItems(p.items)
                const nItems = items.reduce((s, it) => s + (it.cantidad || 1), 0)
                return (
                  <tr key={p.id_pedido}
                    className={`border-b border-cafe-100 dark:border-cafe-700 hover:bg-crema-50/60 dark:hover:bg-cafe-700/30 transition-colors
                      ${i % 2 === 0 ? '' : 'bg-crema-50/20 dark:bg-cafe-800/40'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-cafe-400 dark:text-cafe-500 whitespace-nowrap">
                      #{p.id_pedido}
                    </td>
                    <td className="px-4 py-3 text-sm text-cafe-700 dark:text-crema-200 whitespace-nowrap">
                      {p.fecha_hora && p.fecha_hora !== '' ? formatFecha(p.fecha_hora) : '—'}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-cafe-600 dark:text-cafe-300 truncate max-w-[120px]">
                      {p.nombre_cajero || '—'}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-cafe-600 dark:text-cafe-300 truncate max-w-[120px]">
                      {p.nombre_cliente || <span className="text-cafe-300 dark:text-cafe-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={canal.cls}>{canal.label}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-center text-sm text-cafe-500 dark:text-cafe-400">
                      {nItems > 0 ? `${nItems} item${nItems !== 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right text-sm text-olivo-600 dark:text-olivo-400">
                      {parseFloat(p.descuento) > 0 ? `−${formatMXN(p.descuento)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-cafe-800 dark:text-crema-100 whitespace-nowrap">
                      {formatMXN(p.total)}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className={estado.cls}>{estado.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setDetalle(p)}
                          className="text-xs text-cafe-500 hover:text-cafe-800 dark:hover:text-crema-200 font-medium hover:underline transition-colors whitespace-nowrap"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => generarTicketPDF(p)}
                          title="Descargar ticket PDF"
                          className="p-1 rounded text-cafe-400 hover:text-cafe-700 dark:hover:text-crema-200 hover:bg-crema-100 dark:hover:bg-cafe-700 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <p className="text-xs text-cafe-400">
            Mostrando {(paginaSegura - 1) * POR_PAGINA + 1}–{Math.min(paginaSegura * POR_PAGINA, totalRegistros)} de {totalRegistros} pedidos
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaSegura === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 disabled:opacity-40 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all">
              ← Anterior
            </button>
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              const num = paginaSegura <= 3 ? i + 1 : paginaSegura - 2 + i
              if (num < 1 || num > totalPaginas) return null
              return (
                <button key={num} onClick={() => setPagina(num)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${paginaSegura === num
                      ? 'bg-cafe-700 text-crema-100'
                      : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
                  {num}
                </button>
              )
            })}
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura === totalPaginas}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 disabled:opacity-40 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <ModalDetalle
          pedido={detalle}
          onClose={() => setDetalle(null)}
          onTicket={(p) => { generarTicketPDF(p); setDetalle(null) }}
        />
      )}
    </div>
  )
}

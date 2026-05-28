import { useState, useEffect, useCallback } from 'react'
import { pedidos as pedidosApi, formatMXN, formatFecha, formatFechaHora, canalBadge, estadoBadge } from '../api/api'

const POR_PAGINA = 15
const CANALES  = ['local','didi','rappi','ubereats']
const ESTADOS  = ['pendiente','preparacion','entregado','cancelado']

function hoy() { return new Date().toISOString().split('T')[0] }
function hace30() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

// ─── Modal detalle ────────────────────────────────────────────────────────────
function ModalDetalle({ pedido, onClose }) {
  if (!pedido) return null
  const items  = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : (pedido.items || [])
  const canal  = canalBadge(pedido.canal)
  const estado = estadoBadge(pedido.estado)

  function imprimirTicket() {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({ unit: 'mm', format: [80, 200] })
      let y = 10

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('CAFE+', 40, y, { align: 'center' })
      y += 6

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Folio: ${pedido.id_pedido}`, 40, y, { align: 'center' })
      y += 5
      doc.text(formatFechaHora(pedido.fecha_hora), 40, y, { align: 'center' })
      y += 5
      doc.text(`Canal: ${canal.label}`, 40, y, { align: 'center' })
      if (pedido.nombre_cliente) {
        y += 5
        doc.text(`Cliente: ${pedido.nombre_cliente}`, 40, y, { align: 'center' })
      }
      y += 6
      doc.setLineDashPattern([1, 1], 0)
      doc.line(5, y, 75, y)
      y += 5

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      items.forEach(item => {
        const subtotal = formatMXN(item.precio_unitario * item.cantidad)
        doc.text(`${item.cantidad}x ${item.nombre_producto}`, 5, y)
        doc.text(subtotal, 75, y, { align: 'right' })
        y += 4
        if (item.notas_producto) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(7)
          doc.text(`  (${item.notas_producto})`, 5, y)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          y += 4
        }
      })

      y += 2
      doc.line(5, y, 75, y)
      y += 5

      if (pedido.descuento_aplicado > 0) {
        doc.setFont('helvetica', 'normal')
        doc.text('Descuento:', 5, y)
        doc.text(`-${formatMXN(pedido.descuento_aplicado)}`, 75, y, { align: 'right' })
        y += 5
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('TOTAL:', 5, y)
      doc.text(formatMXN(pedido.total), 75, y, { align: 'right' })
      y += 8
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Gracias por tu visita', 40, y, { align: 'center' })

      doc.save(`ticket-${pedido.id_pedido}.pdf`)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-warm-lg w-full max-w-lg animate-fade-in"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cafe-100 dark:border-cafe-700">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-cafe-500 dark:text-cafe-400">#{pedido.id_pedido}</span>
            <span className={canal.cls}>{canal.label}</span>
            <span className={estado.cls}>{estado.label}</span>
          </div>
          <button onClick={onClose} className="text-cafe-400 hover:text-cafe-700 dark:hover:text-crema-100 text-xl leading-none">&#x2715;</button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm border-b border-cafe-100 dark:border-cafe-700">
          <div>
            <span className="text-cafe-400 text-xs uppercase font-semibold">Fecha</span>
            <p className="text-cafe-800 dark:text-crema-100">{formatFechaHora(pedido.fecha_hora)}</p>
          </div>
          {pedido.nombre_cliente && (
            <div>
              <span className="text-cafe-400 text-xs uppercase font-semibold">Cliente</span>
              <p className="text-cafe-800 dark:text-crema-100">{pedido.nombre_cliente}</p>
            </div>
          )}
          {pedido.notas && (
            <div className="col-span-2">
              <span className="text-cafe-400 text-xs uppercase font-semibold">Notas</span>
              <p className="text-cafe-600 dark:text-cafe-300 italic">{pedido.notas}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cafe-400 uppercase border-b border-cafe-100 dark:border-cafe-700">
                <th className="text-left pb-2">Producto</th>
                <th className="text-center pb-2">Cant.</th>
                <th className="text-right pb-2">Precio</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cafe-50 dark:divide-cafe-700">
              {items.map((item, i) => (
                <tr key={i} className="py-1">
                  <td className="py-2 text-cafe-800 dark:text-crema-100">
                    {item.nombre_producto}
                    {item.notas_producto && <span className="block text-xs text-cafe-400 italic">{item.notas_producto}</span>}
                  </td>
                  <td className="py-2 text-center text-cafe-600 dark:text-cafe-300">{item.cantidad}</td>
                  <td className="py-2 text-right text-cafe-500 dark:text-cafe-400">{formatMXN(item.precio_unitario)}</td>
                  <td className="py-2 text-right font-medium text-cafe-800 dark:text-crema-100">{formatMXN(item.precio_unitario * item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-6 pb-4 border-t border-cafe-100 dark:border-cafe-700 pt-3 space-y-1">
          {pedido.descuento_aplicado > 0 && (
            <div className="flex justify-between text-sm text-olivo-600 dark:text-olivo-400">
              <span>Descuento aplicado</span>
              <span>-{formatMXN(pedido.descuento_aplicado)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-cafe-800 dark:text-crema-100">
            <span>Total</span>
            <span className="text-terracota-500">{formatMXN(pedido.total)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
          <button onClick={imprimirTicket} className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Descargar ticket PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Historial() {
  const [todos,    setTodos]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [detalle,  setDetalle]  = useState(null)
  const [pagina,   setPagina]   = useState(1)

  const [filtros, setFiltros] = useState({
    desde:   hace30(),
    hasta:   hoy(),
    canal:   '',
    estado:  '',
    buscar:  '',
  })

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    const res = await pedidosApi.getAll({
      fecha_desde: filtros.desde,
      fecha_hasta: filtros.hasta,
    })
    if (res.ok) setTodos(res.data)
    else setError('Error cargando historial')
    setLoading(false)
    setPagina(1)
  }, [filtros.desde, filtros.hasta])

  useEffect(() => { cargar() }, [cargar])

  function setFiltro(key, val) {
    setFiltros(f => ({ ...f, [key]: val }))
    setPagina(1)
  }

  // Filtros client-side (canal, estado, buscar)
  const filtrados = todos.filter(p => {
    if (filtros.canal  && p.canal  !== filtros.canal)  return false
    if (filtros.estado && p.estado !== filtros.estado) return false
    if (filtros.buscar) {
      const q = filtros.buscar.toLowerCase()
      const matchId     = String(p.id_pedido).toLowerCase().includes(q)
      const matchCliente = (p.nombre_cliente || '').toLowerCase().includes(q)
      if (!matchId && !matchCliente) return false
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pagActual    = Math.min(pagina, totalPaginas)
  const visibles     = filtrados.slice((pagActual - 1) * POR_PAGINA, pagActual * POR_PAGINA)

  // Totales del período filtrado
  const totalVentas    = filtrados.filter(p => p.estado === 'entregado').reduce((s, p) => s + parseFloat(p.total || 0), 0)
  const totalEntregados = filtrados.filter(p => p.estado === 'entregado').length

  function exportarCSV() {
    const filas = [
      ['ID','Fecha','Cliente','Canal','Estado','Total','Descuento'],
      ...filtrados.map(p => [
        p.id_pedido,
        formatFechaHora(p.fecha_hora),
        p.nombre_cliente || '',
        p.canal,
        p.estado,
        p.total,
        p.descuento_aplicado || 0,
      ])
    ]
    const csv = filas.map(f => f.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `historial-${filtros.desde}-a-${filtros.hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cafe-800 dark:text-crema-100">Historial de pedidos</h1>
          <p className="text-sm text-cafe-500 dark:text-cafe-400 mt-0.5">
            {filtrados.length} pedidos &middot; {totalEntregados} entregados &middot; {formatMXN(totalVentas)} en ventas
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all disabled:opacity-50">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-olivo-500 text-white hover:bg-olivo-600 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Desde */}
          <div>
            <label className="block text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide mb-1.5">Desde</label>
            <input type="date" value={filtros.desde}
              onChange={e => { setFiltros(f => ({ ...f, desde: e.target.value })); setPagina(1) }}
              className="input-cafe text-sm" />
          </div>
          {/* Hasta */}
          <div>
            <label className="block text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide mb-1.5">Hasta</label>
            <input type="date" value={filtros.hasta}
              onChange={e => { setFiltros(f => ({ ...f, hasta: e.target.value })); setPagina(1) }}
              className="input-cafe text-sm" />
          </div>
          {/* Canal */}
          <div>
            <label className="block text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide mb-1.5">Canal</label>
            <select value={filtros.canal} onChange={e => setFiltro('canal', e.target.value)} className="input-cafe text-sm">
              <option value="">Todos</option>
              {CANALES.map(c => <option key={c} value={c}>{c === 'local' ? 'Local' : c === 'didi' ? 'DiDi Food' : c === 'rappi' ? 'Rappi' : 'Uber Eats'}</option>)}
            </select>
          </div>
          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide mb-1.5">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)} className="input-cafe text-sm">
              <option value="">Todos</option>
              {ESTADOS.map(e => <option key={e} value={e}>{estadoBadge(e).label}</option>)}
            </select>
          </div>
          {/* Buscar */}
          <div>
            <label className="block text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide mb-1.5">Buscar</label>
            <input placeholder="ID o cliente..." value={filtros.buscar}
              onChange={e => setFiltro('buscar', e.target.value)}
              className="input-cafe text-sm" />
          </div>
        </div>

        {/* Atajos de período */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { label: 'Hoy',     desde: hoy(), hasta: hoy() },
            { label: 'Semana',  desde: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })(), hasta: hoy() },
            { label: 'Mes',     desde: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })(), hasta: hoy() },
            { label: '3 meses', desde: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0] })(), hasta: hoy() },
          ].map(at => (
            <button key={at.label}
              onClick={() => setFiltros(f => ({ ...f, desde: at.desde, hasta: at.hasta }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                ${filtros.desde === at.desde && filtros.hasta === at.hasta
                  ? 'bg-cafe-700 text-crema-100'
                  : 'bg-crema-100 dark:bg-cafe-700 text-cafe-600 dark:text-cafe-300 hover:bg-crema-200 dark:hover:bg-cafe-600'}`}>
              {at.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-cafe-400">
          <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3"/>
          Cargando historial...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-4xl mb-3">&#x1F4DC;</p>
          <p className="text-cafe-500 dark:text-cafe-400 font-medium">Sin pedidos en el período seleccionado</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-crema-50 dark:bg-cafe-900/50 border-b border-cafe-100 dark:border-cafe-700">
                <tr>
                  {['#Folio','Fecha','Cliente','Canal','Productos','Total','Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cafe-50 dark:divide-cafe-700/50">
                {visibles.map(pedido => {
                  const items  = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : (pedido.items || [])
                  const canal  = canalBadge(pedido.canal)
                  const estado = estadoBadge(pedido.estado)
                  return (
                    <tr key={pedido.id_pedido}
                      onClick={() => setDetalle(pedido)}
                      className="hover:bg-crema-50 dark:hover:bg-cafe-700/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-cafe-500 dark:text-cafe-400">#{pedido.id_pedido}</td>
                      <td className="px-4 py-3 text-cafe-700 dark:text-cafe-300 whitespace-nowrap">{formatFecha(pedido.fecha_hora?.split('T')[0] || pedido.fecha_hora)}</td>
                      <td className="px-4 py-3 text-cafe-800 dark:text-crema-100">{pedido.nombre_cliente || <span className="text-cafe-300 dark:text-cafe-600 italic text-xs">Sin cliente</span>}</td>
                      <td className="px-4 py-3"><span className={canal.cls}>{canal.label}</span></td>
                      <td className="px-4 py-3 text-cafe-500 dark:text-cafe-400">
                        {items.length > 0 ? (
                          <span className="truncate block max-w-[180px]" title={items.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ')}>
                            {items.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-cafe-800 dark:text-crema-100 whitespace-nowrap">{formatMXN(pedido.total)}</td>
                      <td className="px-4 py-3"><span className={estado.cls}>{estado.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <p className="text-xs text-cafe-500 dark:text-cafe-400">
                Mostrando {(pagActual - 1) * POR_PAGINA + 1}–{Math.min(pagActual * POR_PAGINA, filtrados.length)} de {filtrados.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button disabled={pagActual === 1} onClick={() => setPagina(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 disabled:opacity-40 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all">
                  &#x2190; Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagActual) <= 1)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push('...')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((item, i) =>
                    item === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-cafe-400 text-xs">&#x22EF;</span>
                    ) : (
                      <button key={item} onClick={() => setPagina(item)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                          ${pagActual === item
                            ? 'bg-cafe-700 text-crema-100'
                            : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
                        {item}
                      </button>
                    )
                  )}
                <button disabled={pagActual === totalPaginas} onClick={() => setPagina(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 disabled:opacity-40 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all">
                  Siguiente &#x2192;
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal detalle */}
      <ModalDetalle pedido={detalle} onClose={() => setDetalle(null)} />
    </div>
  )
}

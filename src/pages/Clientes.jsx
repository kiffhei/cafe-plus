import { useState, useEffect } from 'react'
import { clientes as clientesApi, pedidos as pedidosApi, formatMXN, formatFecha, canalBadge, estadoBadge } from '../api/api'

function esInactivo(c) {
  if (!c.ultimo_pedido) return false
  const d = new Date(c.ultimo_pedido)
  if (isNaN(d.getTime())) return false
  return (Date.now() - d.getTime()) > 30 * 24 * 60 * 60 * 1000
}

function BadgeCumple() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
      🎂 Cumpleaños
    </span>
  )
}

function BarraVisitas({ visitas, proximo }) {
  const meta   = proximo?.visita || 20
  const pct    = Math.min((visitas / meta) * 100, 100)
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-cafe-600 font-medium">{visitas} visitas</span>
        {proximo?.faltan > 0 && (
          <span className="text-xs text-cafe-400">faltan {proximo.faltan} → {proximo.premio}</span>
        )}
      </div>
      <div className="h-1.5 bg-crema-200 dark:bg-cafe-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(to right, var(--cafe-accent), var(--cafe-btn))' }} />
      </div>
    </div>
  )
}

function ModalPedidos({ cliente, onClose }) {
  const [pedidos, setPedidos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      try {
        const res = await pedidosApi.getAll({ id_cliente: cliente.id_cliente, limit: 10 })
        if (res.ok) {
          // Si la API no filtra por id_cliente, filtrar en frontend por nombre/teléfono
          const todos = res.data || []
          const filtrados = todos.filter(p =>
            p.id_cliente === cliente.id_cliente ||
            p.nombre_cliente === `${cliente.nombre} ${cliente.apellidos}` ||
            p.telefono_cliente === cliente.telefono
          )
          setPedidos(filtrados.length > 0 ? filtrados : todos.slice(0, 10))
        } else {
          setError(res.message || 'Error al cargar pedidos')
        }
      } catch {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: solo recargar pedidos al cambiar de cliente (id), no al editar nombre/teléfono dentro del modal
  }, [cliente.id_cliente])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crema-200 dark:border-cafe-700">
          <div>
            <h2 className="text-lg font-semibold text-cafe-800 dark:text-crema-100">
              Pedidos de {cliente.nombre} {cliente.apellidos}
            </h2>
            <p className="text-xs text-cafe-400 mt-0.5">Últimos pedidos registrados</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-crema-100 dark:hover:bg-cafe-700 text-cafe-400 hover:text-cafe-700 dark:hover:text-crema-100 transition-colors text-xl">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-cafe-400">
              <span className="w-5 h-5 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-2" />
              Cargando pedidos...
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-10 text-cafe-400">
              Este cliente aún no tiene pedidos registrados
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.08)', borderBottom: '1px solid var(--cafe-border)' }}>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cafe-accent)' }}>Fecha</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cafe-accent)' }}>Canal</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cafe-accent)' }}>Total</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cafe-accent)' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const canal  = canalBadge(p.canal)
                  const estado = estadoBadge(p.estado)
                  return (
                    <tr key={p.id_pedido}
                      className="border-b border-crema-100 dark:border-cafe-700 hover:bg-crema-50/50 dark:hover:bg-cafe-700/30 transition-colors">
                      <td className="px-3 py-3 text-cafe-700 dark:text-crema-200">{formatFecha(p.fecha_hora)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${canal.cls}`}>
                          {canal.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-cafe-800 dark:text-crema-100">{formatMXN(p.total)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estado.cls}`}>
                          {estado.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-crema-200 dark:border-cafe-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function ModalCliente({ cliente, onClose, onSaved }) {
  const esNuevo = !cliente?.id_cliente
  const [form, setForm] = useState({
    nombre:           cliente?.nombre           || '',
    apellidos:        cliente?.apellidos        || '',
    fecha_nacimiento: cliente?.fecha_nacimiento || '',
    telefono:         cliente?.telefono         || '',
    email:            cliente?.email            || '',
    notas:            cliente?.notas            || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setError('')
    if (!form.nombre || !form.apellidos || !form.telefono) {
      setError('Nombre, apellidos y teléfono son requeridos'); return
    }
    setLoading(true)
    try {
      const payload = esNuevo
        ? { ...form }
        : { id_cliente: cliente.id_cliente, ...form }
      const res = esNuevo
        ? await clientesApi.create(payload)
        : await clientesApi.update(payload)
      if (!res.ok) { setError(res.message); return }
      onSaved()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crema-200 dark:border-cafe-700">
          <div>
            <h2 className="text-lg font-semibold text-cafe-800 dark:text-crema-100">
              {esNuevo ? 'Nuevo cliente Plus' : 'Editar cliente'}
            </h2>
            {esNuevo && (
              <p className="text-xs text-cafe-400 mt-0.5">Membresía con 5% de descuento permanente</p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-crema-100 dark:hover:bg-cafe-700 text-cafe-400 hover:text-cafe-700 dark:hover:text-crema-100 transition-colors text-xl">
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cafe-600 dark:text-cafe-400 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="input-cafe w-full" placeholder="María" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 dark:text-cafe-400 mb-1">Apellidos *</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)}
                className="input-cafe w-full" placeholder="López García" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cafe-600 dark:text-cafe-400 mb-1">Teléfono *</label>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
              className="input-cafe w-full" placeholder="55 1234 5678" type="tel" />
          </div>

          <div>
            <label className="block text-xs font-medium text-cafe-600 dark:text-cafe-400 mb-1">Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)}
              className="input-cafe w-full" placeholder="correo@ejemplo.com" type="email" />
          </div>

          <div>
            <label className="block text-xs font-medium text-cafe-600 dark:text-cafe-400 mb-1">
              Fecha de nacimiento
              <span className="text-cafe-400 font-normal ml-1">(para descuento de cumpleaños 🎂)</span>
            </label>
            <input type="date" value={form.fecha_nacimiento}
              onChange={e => set('fecha_nacimiento', e.target.value)}
              className="input-cafe w-full" />
          </div>

          <div>
            <label className="block text-xs font-medium text-cafe-600 dark:text-cafe-400 mb-1">
              Notas y preferencias
              <span className="text-cafe-400 font-normal ml-1">(alergias, preferencias, etc.)</span>
            </label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              className="input-cafe w-full resize-none" rows={2}
              placeholder="Ej: sin azúcar, alérgico a gluten, prefiere leche de avena..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-crema-200 dark:border-cafe-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {esNuevo ? 'Registrar cliente' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [lista, setLista]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [buscar, setBuscar]           = useState('')
  const [modal, setModal]             = useState(null)
  const [modalPedidos, setModalPedidos] = useState(null)
  const [toggling, setToggling]       = useState(null)
  const [error, setError]             = useState('')

  const userStr = localStorage.getItem('cafe_user')
  const user    = userStr ? JSON.parse(userStr) : {}
  const esAdmin = user.categoria === 'admin'

  async function cargar() {
    setLoading(true)
    try {
      const res = await clientesApi.getAll()
      if (res.ok) setLista(res.data)
      else setError(res.message)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function handleToggle(c) {
    setToggling(c.id_cliente)
    try {
      await clientesApi.toggle(c.id_cliente, !c.activo)
      await cargar()
    } catch { setError('Error al cambiar estado') }
    finally { setToggling(null) }
  }

  const filtrados = lista.filter(c =>
    `${c.nombre} ${c.apellidos} ${c.telefono}`.toLowerCase().includes(buscar.toLowerCase())
  )

  const cumpleHoy = lista.filter(c => c.es_cumpleanos).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cafe-800 dark:text-crema-100">Clientes Plus</h1>
          <p className="text-sm text-cafe-500 mt-0.5">
            {lista.filter(c => c.activo).length} activos
            {cumpleHoy > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">
                · 🎂 {cumpleHoy} cumplen años hoy
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setModal('nuevo')}
          className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span>
          Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400 text-sm">🔍</span>
        <input value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="input-cafe w-full pl-9 max-w-sm" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Alerta cumpleaños */}
      {cumpleHoy > 0 && (
        <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🎂</span>
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {cumpleHoy === 1 ? '1 cliente cumple años hoy' : `${cumpleHoy} clientes cumplen años hoy`}
            </p>
            <p className="text-xs text-yellow-600">Aplica 30% de descuento en toda la cuenta</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="table-wrapper">
        {loading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-crema-100 dark:border-cafe-700">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full animate-pulse bg-cafe-200 dark:bg-cafe-700 shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-32 rounded-full animate-pulse bg-cafe-200 dark:bg-cafe-700" />
                        <div className="h-2.5 w-24 rounded-full animate-pulse bg-cafe-100 dark:bg-cafe-800" />
                      </div>
                    </div>
                  </td>
                  {[60, 40, 30, 25].map((w, j) => (
                    <td key={j} className="hidden sm:table-cell px-5 py-4">
                      <div className="h-3 rounded-full animate-pulse bg-cafe-200 dark:bg-cafe-700" style={{ width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-cafe-300 dark:text-cafe-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <p className="text-cafe-500 dark:text-cafe-400 font-medium">
              {buscar ? 'Sin clientes con ese criterio' : 'Aún no hay clientes registrados'}
            </p>
            {!buscar && <p className="text-cafe-400 dark:text-cafe-500 text-xs mt-1">Usa el botón "+ Nuevo" para agregar el primero</p>}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-crema-50 dark:bg-cafe-900 border-b border-crema-200 dark:border-cafe-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Cliente</th>
                <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Contacto</th>
                <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide w-48">Visitas / Meta</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Descuento</th>
                {esAdmin && <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Estado</th>}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => (
                <tr key={c.id_cliente}
                  className={`border-b border-crema-100 dark:border-cafe-700 hover:bg-crema-50/50 dark:hover:bg-cafe-700/30 transition-colors
                    ${!c.activo ? 'opacity-50' : ''}
                    ${i % 2 === 0 ? '' : 'bg-crema-50/20 dark:bg-cafe-800/40'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-terracota-500/10 flex items-center justify-center text-terracota-500 font-bold text-sm shrink-0">
                        {c.nombre?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-cafe-800 dark:text-crema-100 text-sm flex items-center gap-2 flex-wrap">
                          {c.nombre} {c.apellidos}
                          {c.es_cumpleanos && <BadgeCumple />}
                          {c.notas && (
                            <span title={c.notas} className="cursor-help text-cafe-400 hover:text-cafe-600 dark:hover:text-cafe-300">📝</span>
                          )}
                          {c.visitas_acumuladas > 0 && esInactivo(c) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cafe-100 dark:bg-cafe-700 text-cafe-500 dark:text-cafe-300">
                              💤 Inactivo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-cafe-400">desde {c.fecha_registro || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-4">
                    <div className="text-sm text-cafe-700 dark:text-crema-200">{c.telefono}</div>
                    {c.email && <div className="text-xs text-cafe-400 truncate max-w-[160px]">{c.email}</div>}
                  </td>
                  <td className="hidden md:table-cell px-5 py-4 w-48">
                    <BarraVisitas
                      visitas={c.visitas_acumuladas || 0}
                      proximo={c.proximo_regalo}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
                        ${c.es_cumpleanos ? 'bg-yellow-100 text-yellow-700' : ''}`}
                      style={!c.es_cumpleanos ? {
                        background: 'var(--status-ok-bg)',
                        color: 'var(--status-ok-fg)',
                      } : undefined}>
                      {c.es_cumpleanos ? '30%' : '5%'}
                    </span>
                  </td>
                  {esAdmin && (
                    <td className="hidden sm:table-cell px-5 py-4">
                      <button onClick={() => handleToggle(c)}
                        disabled={toggling === c.id_cliente}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer
                          ${c.activo ? '' : 'bg-gray-300'}`}
                        style={c.activo ? { background: 'var(--cafe-btn)', transition: 'background 0.8s ease' } : undefined}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                          ${c.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setModal(c)}
                        className="text-xs text-cafe-500 hover:text-cafe-800 dark:hover:text-crema-100 font-medium hover:underline transition-colors">
                        Editar
                      </button>
                      {c.visitas_acumuladas > 0 && (
                        <button onClick={() => setModalPedidos(c)}
                          className="text-xs text-cafe-500 hover:text-cafe-800 dark:hover:text-crema-100 font-medium hover:underline transition-colors">
                          Ver pedidos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ModalCliente
          cliente={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}

      {modalPedidos && (
        <ModalPedidos
          cliente={modalPedidos}
          onClose={() => setModalPedidos(null)}
        />
      )}
    </div>
  )
}

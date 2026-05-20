import { useState, useEffect } from 'react'
import { productos as productosApi } from '../api/api'

const CATEGORIAS = ['café', 'bebida', 'pan', 'sándwich', 'otro']

function ModalProducto({ producto, onClose, onSaved }) {
  const esNuevo = !producto?.id_producto
  const [form, setForm] = useState({
    nombre:          producto?.nombre          || '',
    descripcion:     producto?.descripcion     || '',
    categoria:       producto?.categoria       || 'café',
    cantidad_stock:  producto?.cantidad_stock  ?? 0,
    costo:           producto?.costo           ?? '',
    precio_venta:    producto?.precio_venta    ?? '',
    peso_volumen:    producto?.peso_volumen     || '',
    unidad:          producto?.unidad          || 'g',
    empaque_local:   producto?.empaque_local   || '',
    empaque_deliver: producto?.empaque_deliver || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const margen = form.costo && form.precio_venta
    ? (((form.precio_venta - form.costo) / form.precio_venta) * 100).toFixed(1)
    : null

  async function handleSubmit() {
    setError('')
    if (!form.nombre || !form.categoria) {
      setError('Nombre y categoría son requeridos'); return
    }
    if (!form.precio_venta || parseFloat(form.precio_venta) <= 0) {
      setError('El precio de venta debe ser mayor a 0'); return
    }
    setLoading(true)
    try {
      const payload = esNuevo
        ? { ...form }
        : { id_producto: producto.id_producto, ...form }
      const res = esNuevo
        ? await productosApi.create(payload)
        : await productosApi.update(payload)
      if (!res.ok) { setError(res.message); return }
      onSaved()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crema-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-cafe-800">
            {esNuevo ? 'Nuevo producto' : 'Editar producto'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-crema-100 text-cafe-400 hover:text-cafe-700 transition-colors text-xl">
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Nombre + Categoría */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-cafe-600 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="input-cafe w-full" placeholder="Café americano" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Categoría *</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
                className="input-cafe w-full">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-cafe-600 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              className="input-cafe w-full resize-none" rows={2}
              placeholder="Descripción breve del producto..." />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Costo $</label>
              <input type="number" value={form.costo}
                onChange={e => set('costo', e.target.value)}
                className="input-cafe w-full" placeholder="0.00" min="0" step="0.50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Precio venta $ *</label>
              <input type="number" value={form.precio_venta}
                onChange={e => set('precio_venta', e.target.value)}
                className="input-cafe w-full" placeholder="0.00" min="0" step="0.50" />
            </div>
            <div className="flex flex-col justify-end">
              {margen !== null && (
                <div className={`rounded-lg px-3 py-2 text-center
                  ${parseFloat(margen) >= 50 ? 'bg-olivo-50 text-olivo-700' :
                    parseFloat(margen) >= 30 ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-600'}`}>
                  <div className="text-xs font-medium">Margen</div>
                  <div className="text-lg font-bold">{margen}%</div>
                </div>
              )}
            </div>
          </div>

          {/* Stock + Unidad */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Stock</label>
              <input type="number" value={form.cantidad_stock}
                onChange={e => set('cantidad_stock', e.target.value)}
                className="input-cafe w-full" placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Peso/Vol</label>
              <input value={form.peso_volumen} onChange={e => set('peso_volumen', e.target.value)}
                className="input-cafe w-full" placeholder="250" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Unidad</label>
              <select value={form.unidad} onChange={e => set('unidad', e.target.value)}
                className="input-cafe w-full">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="pz">pz</option>
                <option value="oz">oz</option>
              </select>
            </div>
          </div>

          {/* Empaque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Empaque local</label>
              <input value={form.empaque_local} onChange={e => set('empaque_local', e.target.value)}
                className="input-cafe w-full" placeholder="Taza cerámica" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Empaque deliver</label>
              <input value={form.empaque_deliver} onChange={e => set('empaque_deliver', e.target.value)}
                className="input-cafe w-full" placeholder="Vaso desechable 12oz" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-crema-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {esNuevo ? 'Crear producto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Productos() {
  const [lista, setLista]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [buscar, setBuscar]         = useState('')
  const [filtroCategoria, setFiltro] = useState('todas')
  const [modal, setModal]           = useState(null)
  const [toggling, setToggling]     = useState(null)
  const [error, setError]           = useState('')

  // Leer rol del usuario desde localStorage
  const userStr  = localStorage.getItem('cafe_user')
  const user     = userStr ? JSON.parse(userStr) : {}
  const esAdmin  = user.categoria === 'admin'

  async function cargar() {
    setLoading(true)
    try {
      const res = await productosApi.getAll()
      if (res.ok) setLista(res.data)
      else setError(res.message)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function handleToggle(p) {
    setToggling(p.id_producto)
    try {
      await productosApi.toggle(p.id_producto, !p.activo)
      await cargar()
    } catch { setError('Error al cambiar estado') }
    finally { setToggling(null) }
  }

  const filtrados = lista.filter(p => {
    const matchBuscar = `${p.nombre} ${p.descripcion || ''}`.toLowerCase().includes(buscar.toLowerCase())
    const matchCat    = filtroCategoria === 'todas' || p.categoria === filtroCategoria
    return matchBuscar && matchCat
  })

  const categoriasCounts = CATEGORIAS.reduce((acc, c) => {
    acc[c] = lista.filter(p => p.categoria === c).length
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cafe-800">Productos</h1>
          <p className="text-sm text-cafe-500 mt-0.5">
            {lista.filter(p => p.activo).length} activos · {lista.length} total
          </p>
        </div>
        {esAdmin && (
          <button onClick={() => setModal('nuevo')}
            className="btn-primary flex items-center gap-2">
            <span className="text-lg leading-none">+</span>
            Nuevo producto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400 text-sm">🔍</span>
          <input value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar producto..."
            className="input-cafe pl-9 w-56" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todas', ...CATEGORIAS].map(c => (
            <button key={c} onClick={() => setFiltro(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                ${filtroCategoria === c
                  ? 'bg-cafe-700 text-white'
                  : 'bg-white border border-crema-200 text-cafe-600 hover:bg-crema-50'}`}>
              {c} {c !== 'todas' && categoriasCounts[c] > 0 && `(${categoriasCounts[c]})`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-crema-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-cafe-400">
            <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3" />
            Cargando productos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-cafe-400">
            {buscar || filtroCategoria !== 'todas' ? 'Sin resultados para ese filtro' : 'No hay productos registrados'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-crema-50 border-b border-crema-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Producto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Categoría</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Costo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Precio</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Margen</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Stock</th>
                {esAdmin && <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Estado</th>}
                {esAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const margen = p.costo && p.precio_venta
                  ? (((p.precio_venta - p.costo) / p.precio_venta) * 100).toFixed(1)
                  : null
                return (
                  <tr key={p.id_producto}
                    className={`border-b border-crema-100 hover:bg-crema-50/50 transition-colors
                      ${!p.activo ? 'opacity-50' : ''}
                      ${i % 2 === 0 ? '' : 'bg-crema-50/20'}`}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-cafe-800 text-sm">{p.nombre}</div>
                      {p.descripcion && (
                        <div className="text-xs text-cafe-400 mt-0.5 truncate max-w-xs">{p.descripcion}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-crema-100 text-cafe-700 capitalize">
                        {p.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-cafe-600">
                      {p.costo ? `$${parseFloat(p.costo).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-cafe-800">
                      ${parseFloat(p.precio_venta || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {margen !== null && (
                        <span className={`text-xs font-semibold
                          ${parseFloat(margen) >= 50 ? 'text-olivo-600' :
                            parseFloat(margen) >= 30 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {margen}%
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-cafe-600">
                      {p.cantidad_stock ?? '—'}
                    </td>
                    {esAdmin && (
                      <td className="px-5 py-4">
                        <button onClick={() => handleToggle(p)}
                          disabled={toggling === p.id_producto}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer
                            ${p.activo ? 'bg-olivo-500' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                            ${p.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    )}
                    {esAdmin && (
                      <td className="px-5 py-4">
                        <button onClick={() => setModal(p)}
                          className="text-xs text-cafe-500 hover:text-cafe-800 font-medium hover:underline transition-colors">
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && esAdmin && (
        <ModalProducto
          producto={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}
    </div>
  )
}

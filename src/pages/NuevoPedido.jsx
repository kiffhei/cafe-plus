import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productos as productosApi, clientes as clientesApi, pedidos as pedidosApi,
         formatMXN } from '../api/api'
import { useTheme } from '../context/ThemeContext'
import { getProductImage } from '../lib/productImages'

const CANALES = ['local','didi','rappi','ubereats']
const ESTADOS_CANAL = { local:'Local', didi:'DiDi Food', rappi:'Rappi', ubereats:'Uber Eats' }

function BuscadorCliente({ onSelect, clienteSeleccionado, onClear }) {
  const [buscar, setBuscar] = useState('')
  const [lista, setLista]   = useState([])
  const [open, setOpen]     = useState(false)

  async function buscarClientes(q) {
    if (!q || q.length < 2) { setLista([]); return }
    const res = await clientesApi.getAll({ buscar: q })
    if (res.ok) setLista(res.data.filter(c => c.activo).slice(0, 5))
  }

  function handleChange(e) {
    setBuscar(e.target.value)
    setOpen(true)
    buscarClientes(e.target.value)
  }

  if (clienteSeleccionado) return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--status-ok-bg)', border: '1px solid var(--cafe-accent)' }}>
      <div>
        <p className="text-sm font-medium text-cafe-800 dark:text-crema-100">
          {clienteSeleccionado.nombre} {clienteSeleccionado.apellidos}
          {clienteSeleccionado.es_cumpleanos && <span className="ml-2">🎂</span>}
        </p>
        <p className="text-xs text-cafe-500 dark:text-cafe-400">
          {clienteSeleccionado.visitas_acumuladas} visitas ·{' '}
          <span className="font-semibold text-accent-theme">
            {clienteSeleccionado.es_cumpleanos ? '30%' : '5%'} descuento
          </span>
        </p>
      </div>
      <button onClick={onClear} className="text-cafe-400 hover:text-red-500 text-lg ml-3">×</button>
    </div>
  )

  return (
    <div className="relative">
      <input value={buscar} onChange={handleChange} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente por nombre o teléfono..."
        className="input-cafe w-full" />
      {open && lista.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 rounded-lg shadow-warm overflow-hidden">
          {lista.map(c => (
            <button key={c.id_cliente} onMouseDown={() => { onSelect(c); setBuscar(''); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 hover:bg-crema-50 dark:hover:bg-cafe-700 border-b border-cafe-100 dark:border-cafe-700 last:border-0">
              <p className="text-sm font-medium text-cafe-800 dark:text-crema-100">
                {c.nombre} {c.apellidos}
                {c.es_cumpleanos && ' 🎂'}
              </p>
              <p className="text-xs text-cafe-400">{c.telefono} · {c.visitas_acumuladas} visitas</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NuevoPedido() {
  const { darkMode } = useTheme()
  const navigate = useNavigate()
  const [canal, setCanal]         = useState('local')
  const [cliente, setCliente]     = useState(null)
  const [catalogo, setCatalogo]   = useState([])
  const [carrito, setCarrito]     = useState([])  // { producto, cantidad, notas }
  const [notasPedido, setNotas]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [loadingCat, setLoadingCat] = useState(true)
  const [exito, setExito]         = useState(null)
  const [error, setError]         = useState('')
  const [buscarProd, setBuscarProd] = useState('')
  const [filtroCategoria, setFiltro] = useState('todas')

  useEffect(() => {
    productosApi.getAll({ activo: 'true' }).then(res => {
      if (res.ok) setCatalogo(res.data)
    }).finally(() => setLoadingCat(false))
  }, [])

  // Cálculos de descuento
  const descuentoPct = cliente
    ? (cliente.es_cumpleanos ? 0.30 : 0.05)
    : 0

  const subtotal = carrito.reduce((s, item) =>
    s + (parseFloat(item.producto.precio_venta) * item.cantidad), 0)
  const descuento = subtotal * descuentoPct
  const total     = subtotal - descuento

  // Regalo por visitas
  const regaloActual = (() => {
    if (!cliente) return null
    const v = cliente.visitas_acumuladas
    if (v === 4)  return { label: '1 café gratis en esta visita (visita 5)', aplicar: true }
    if (v === 9)  return { label: '1 muffin gratis en esta visita (visita 10)', aplicar: true }
    if (v === 14) return { label: '2 cafés gratis en esta visita (visita 15)', aplicar: true }
    return null
  })()

  function agregarProducto(prod) {
    setCarrito(c => {
      const idx = c.findIndex(i => i.producto.id_producto === prod.id_producto)
      if (idx >= 0) {
        const nuevo = [...c]
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1 }
        return nuevo
      }
      return [...c, { producto: prod, cantidad: 1, notas: '' }]
    })
  }

  function cambiarCantidad(id, delta) {
    setCarrito(c => c.map(i =>
      i.producto.id_producto === id
        ? { ...i, cantidad: Math.max(0, i.cantidad + delta) }
        : i
    ).filter(i => i.cantidad > 0))
  }

  function cambiarNotas(id, val) {
    setCarrito(c => c.map(i =>
      i.producto.id_producto === id ? { ...i, notas: val } : i
    ))
  }

  async function confirmarPedido() {
    if (carrito.length === 0) { setError('Agrega al menos un producto'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        canal,
        id_cliente: cliente?.id_cliente || '',
        descuento_aplicado: descuento,
        notas: notasPedido,
        items: carrito.map(i => ({
          id_producto:     i.producto.id_producto,
          nombre_producto: i.producto.nombre,
          cantidad:        i.cantidad,
          precio_unitario: i.producto.precio_venta,
          notas_producto:  i.notas,
        }))
      }
      const res = await pedidosApi.create(payload)
      if (!res.ok) { setError(res.message); return }
      setExito(res.data)
      setCarrito([])
      setCliente(null)
      setNotas('')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const normCat = (c = '') =>
    c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const categorias = [...new Set(catalogo.map(p => normCat(p.categoria)))]
  const catalogoFiltrado = catalogo.filter(p => {
    const matchBuscar = p.nombre.toLowerCase().includes(buscarProd.toLowerCase())
    const matchCat    = filtroCategoria === 'todas' || normCat(p.categoria) === filtroCategoria
    return matchBuscar && matchCat
  })

  if (exito) return (
    <div className="max-w-md mx-auto text-center py-16 animate-fade-in">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: 'var(--cafe-btn)', transition: 'background 0.8s ease' }}>
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-cafe-800 dark:text-crema-100 mb-2">¡Pedido creado!</h2>
      <p className="text-cafe-500 mb-1">Folio: <span className="font-mono font-semibold">{exito.id_pedido}</span></p>
      <p className="text-cafe-500 mb-6">Total: <span className="font-semibold text-cafe-700 dark:text-crema-200">{formatMXN(exito.total)}</span></p>
      <div className="flex gap-3 justify-center">
      <button onClick={() => setExito(null)} className="btn-secondary">Nuevo pedido</button>
      <button onClick={() => navigate("/pedidos-hoy")} className="btn-primary">Ver pedidos del día →</button>
    </div>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Panel izquierdo — catálogo */}
      <div className="flex-1 min-w-0">
        {/* Canal + Cliente */}
        <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 p-5 mb-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-cafe-600 dark:text-cafe-400 uppercase tracking-wide mb-2">Canal de venta</label>
              <div className="flex gap-2 flex-wrap">
                {CANALES.map(c => (
                  <button key={c} onClick={() => setCanal(c)}
                    className={`px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-medium transition-all
                      ${canal === c
                        ? 'tab-active-theme'
                        : 'bg-crema-100 dark:bg-cafe-700 text-cafe-600 dark:text-cafe-300 hover:bg-crema-200 dark:hover:bg-cafe-600'}`}>
                    {ESTADOS_CANAL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cafe-600 dark:text-cafe-400 uppercase tracking-wide mb-2">
                Cliente Plus <span className="font-normal text-cafe-400">(opcional)</span>
              </label>
              <BuscadorCliente
                onSelect={setCliente}
                clienteSeleccionado={cliente}
                onClear={() => setCliente(null)}
              />
            </div>
          </div>
          {regaloActual && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
              🎁 {regaloActual.label}
            </div>
          )}
        </div>

        {/* Filtros catálogo */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cafe-400 text-xs">🔍</span>
            <input value={buscarProd} onChange={e => setBuscarProd(e.target.value)}
              placeholder="Buscar..." className="input-cafe pl-7 py-1.5 text-xs w-40" />
          </div>
          {['todas', ...categorias].map(cat => (
            <button key={cat} onClick={() => setFiltro(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                ${filtroCategoria === cat
                  ? 'tab-active-theme'
                  : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300'}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        {loadingCat ? (
          <div className="flex items-center justify-center py-12 text-cafe-400">
            <span className="w-5 h-5 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-2"/>Cargando...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {catalogoFiltrado.map(prod => {
              const enCarrito = carrito.find(i => i.producto.id_producto === prod.id_producto)
              const imgUrl = getProductImage(prod.nombre, prod.categoria)
              return (
                <button key={prod.id_producto} onClick={() => agregarProducto(prod)}
                  className={`relative text-left rounded-xl border transition-all overflow-hidden
                    ${enCarrito ? 'border-2 shadow-lg' : 'hover:shadow-warm hover:-translate-y-0.5'}`}
                  style={enCarrito
                    ? { borderColor: 'var(--cafe-accent)' }
                    : { borderColor: 'var(--cafe-border)', background: darkMode ? 'var(--cafe-sb-bg)' : 'white' }
                  }>
                  {/* imagen */}
                  <div className="relative h-28 w-full overflow-hidden"
                       style={{ background: 'linear-gradient(135deg, var(--cafe-btn), var(--cafe-accent))' }}>
                    <img
                      src={imgUrl}
                      alt={prod.nombre}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {enCarrito && (
                      <span className="absolute top-2 right-2 w-6 h-6 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg"
                        style={{ background: 'var(--cafe-btn)' }}>
                        {enCarrito.cantidad}
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-2 text-white/80 text-[10px] capitalize font-medium">
                      {prod.categoria}
                    </span>
                  </div>
                  {/* info */}
                  <div className="p-2.5">
                    <p className="text-xs font-semibold leading-tight mb-1 line-clamp-2"
                       style={{ color: darkMode ? 'rgba(255,255,255,0.92)' : '#1a4a34' }}>{prod.nombre}</p>
                    <p className="text-sm font-bold text-accent-theme">{formatMXN(prod.precio_venta)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel derecho — resumen */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm sticky top-0">
          <div className="px-5 py-4 border-b border-cafe-100 dark:border-cafe-700">
            <h2 className="font-semibold text-cafe-800 dark:text-crema-100">Resumen del pedido</h2>
            <p className="text-xs text-cafe-400 mt-0.5">{ESTADOS_CANAL[canal]} · {carrito.length} productos</p>
          </div>

          {/* Items del carrito */}
          <div className="px-5 py-3 max-h-64 overflow-y-auto space-y-3">
            {carrito.length === 0 ? (
              <p className="text-cafe-400 text-sm text-center py-6">Selecciona productos del catálogo</p>
            ) : carrito.map(item => (
              <div key={item.producto.id_producto}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-cafe-800 dark:text-crema-100 font-medium flex-1 mr-2 leading-tight">
                    {item.producto.nombre}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => cambiarCantidad(item.producto.id_producto, -1)}
                      className="w-6 h-6 rounded-full bg-crema-200 dark:bg-cafe-700 text-cafe-700 dark:text-crema-200 text-sm flex items-center justify-center hover:bg-crema-300 dark:hover:bg-cafe-600">−</button>
                    <span className="w-6 text-center text-sm font-semibold text-cafe-800 dark:text-crema-100">{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.producto.id_producto, 1)}
                      className="w-6 h-6 rounded-full bg-crema-200 dark:bg-cafe-700 text-cafe-700 dark:text-crema-200 text-sm flex items-center justify-center hover:bg-crema-300 dark:hover:bg-cafe-600">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <input value={item.notas} onChange={e => cambiarNotas(item.producto.id_producto, e.target.value)}
                    placeholder="Nota (sin azúcar, etc.)"
                    className="text-xs text-cafe-400 dark:text-cafe-500 bg-transparent border-0 p-0 focus:outline-none w-full mr-2 placeholder-cafe-300 dark:placeholder-cafe-600" />
                  <span className="text-xs text-cafe-500 dark:text-cafe-400 shrink-0">
                    {formatMXN(item.producto.precio_venta * item.cantidad)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Notas del pedido */}
          {carrito.length > 0 && (
            <div className="px-5 pb-3">
              <textarea value={notasPedido} onChange={e => setNotas(e.target.value)}
                placeholder="Notas del pedido (instrucciones especiales...)"
                className="input-cafe w-full text-xs resize-none" rows={2} />
            </div>
          )}

          {/* Totales */}
          <div className="px-5 py-3 border-t border-cafe-100 dark:border-cafe-700 space-y-1.5">
            <div className="flex justify-between text-sm text-cafe-600 dark:text-cafe-400">
              <span>Subtotal</span>
              <span>{formatMXN(subtotal)}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-sm text-accent-theme">
                <span>Descuento {cliente?.es_cumpleanos ? '🎂 30%' : '5% Plus'}</span>
                <span>−{formatMXN(descuento)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-cafe-800 dark:text-crema-100 pt-1 border-t border-cafe-100 dark:border-cafe-700">
              <span>Total</span>
              <span className="text-accent-theme">{formatMXN(total)}</span>
            </div>
          </div>

          {error && (
            <div className="mx-5 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Botón confirmar */}
          <div className="px-5 pb-5">
            <button onClick={confirmarPedido} disabled={loading || carrito.length === 0}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
              {loading ? 'Procesando...' : `Confirmar pedido · ${formatMXN(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

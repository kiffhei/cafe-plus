// ============================================================
// CAFÉ+ — API Client v2
// fetch nativo sin headers — evita preflight CORS con Apps Script
// ============================================================

const BASE = import.meta.env.VITE_API_URL

function getUserMeta() {
  try {
    const raw = localStorage.getItem('clerk_user_meta')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// appToken — emitido por GAS (clerkExchange) tras verificar la sesión real de
// Clerk. GAS ya no confía en userCategoria/userId del cliente para autorizar,
// solo en este token. Ver AuthContext.jsx para cómo se obtiene y guarda.
function getAppToken() {
  return localStorage.getItem('cafe_app_token') || ''
}

// Fetch con timeout configurable (default 25s — Apps Script puede tardar)
async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado. Apps Script tardó demasiado.', { cause: err })
    throw err
  }
}

async function apiGet(action, params = {}) {
  const meta = getUserMeta()
  const url = new URL(BASE)
  url.searchParams.set('action', action)
  url.searchParams.set('apiKey', import.meta.env.VITE_GAS_API_KEY)
  url.searchParams.set('appToken', getAppToken())
  url.searchParams.set('userId', meta.id_usuario || '')
  url.searchParams.set('userCategoria', meta.categoria || 'cajero')
  url.searchParams.set('usuario', meta.usuario || '')
  url.searchParams.set('nombre', meta.nombre || '')
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const res = await fetchWithTimeout(url.toString())
  return res.json()
}

async function apiPost(action, body = {}) {
  const meta = getUserMeta()
  const url = `${BASE}?action=${action}&apiKey=${import.meta.env.VITE_GAS_API_KEY}`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      apiKey:        import.meta.env.VITE_GAS_API_KEY,
      appToken:      getAppToken(),
      userId:        meta.id_usuario || '',
      userCategoria: meta.categoria || 'cajero',
      usuario:       meta.usuario   || '',
      nombre:        meta.nombre    || '',
    }),
  })
  return res.json()
}

export const auth = {
  login: (usuario, password) =>
    fetchWithTimeout(`${BASE}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    }, 20000).then(r => r.json()),

  // Canjea el token de sesión de Clerk por un appToken de GAS ya verificado.
  // No usa apiPost() porque todavía no hay appToken que enviar — es lo que emite.
  clerkExchange: (clerkToken) =>
    fetchWithTimeout(`${BASE}?action=clerkExchange&apiKey=${import.meta.env.VITE_GAS_API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({ clerkToken, apiKey: import.meta.env.VITE_GAS_API_KEY }),
    }).then(r => r.json()),
}

export const usuarios = {
  getAll:  ()           => apiGet('getUsuarios'),
  create:  (data)       => apiPost('createUsuario', data),
  update:  (data)       => apiPost('updateUsuario', data),
  toggle:  (id, activo) => apiPost('toggleUsuario', { id_usuario: id, activo }),
}

export const productos = {
  getAll:  (params = {}) => apiGet('getProductos', params),
  create:  (data)        => apiPost('createProducto', data),
  update:  (data)        => apiPost('updateProducto', data),
  toggle:  (id, activo)  => apiPost('toggleProducto', { id_producto: id, activo }),
}

export const clientes = {
  getAll:      (params = {}) => apiGet('getClientes', params),
  create:      (data)        => apiPost('createCliente', data),
  update:      (data)        => apiPost('updateCliente', data),
  toggle:      (id, activo)  => apiPost('toggleCliente', { id_cliente: id, activo }),
  sumarVisita: (id)          => apiPost('sumarVisita', { id_cliente: id }),
}

export const pedidos = {
  // sin_detalle=true → GAS omite el join con DetallePedidos (más rápido para listas)
  getAll:        (params = {}) => apiGet('getPedidos', { ...params, sin_detalle: 'true' }),
  getHoy:        (params = {}) => apiGet('getPedidos', { ...params, sin_detalle: 'true' }),
  // Con detalle → incluye campo items (necesario para calcular producto top)
  getAllDetalle:  (params = {}) => apiGet('getPedidos', { ...params }),
  getById:       (id)          => apiGet('getPedidoById', { id }),
  create:        (data)        => apiPost('createPedido', data),
  updateEstado:  (id, estado)  => apiPost('updateEstado', { id_pedido: id, estado }),
}

export const analytics = {
  getPeriodo: (desde, hasta) =>
    apiGet('getAnalytics', { fecha_desde: desde, fecha_hasta: hasta }),
}

// ── Helpers de formato ────────────────────────────────────────

export function formatMXN(cantidad) {
  const num = parseFloat(cantidad)
  if (cantidad == null || cantidad === '' || isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatFecha(fechaStr) {
  if (fechaStr == null || fechaStr === '') return '—'
  // Si viene como datetime completo (contiene 'T' o espacio), usar directo.
  // Si viene solo como fecha YYYY-MM-DD, agregar hora para evitar desfase UTC.
  const raw = String(fechaStr)
  const iso = raw.includes('T') || raw.includes(' ') ? raw : `${raw}T12:00:00`
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(d)
}

export function formatFechaHora(fechaStr) {
  if (fechaStr == null || fechaStr === '') return '—'
  const d = new Date(String(fechaStr))
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Mexico_City',
  }).format(d)
}

export function canalBadge(canal) {
  const map = {
    local:    { label: 'Local',     cls: 'badge-canal-local' },
    didi:     { label: 'DiDi Food', cls: 'badge-canal-didi' },
    rappi:    { label: 'Rappi',     cls: 'badge-canal-rappi' },
    ubereats: { label: 'Uber Eats', cls: 'badge-canal-ubereats' },
  }
  return map[canal] || { label: canal, cls: '' }
}

export function estadoBadge(estado) {
  const map = {
    pendiente:   { label: 'Pendiente',   cls: 'badge-estado-pendiente' },
    preparacion: { label: 'En prep.',    cls: 'badge-estado-preparacion' },
    entregado:   { label: 'Entregado',   cls: 'badge-estado-entregado' },
    cancelado:   { label: 'Cancelado',   cls: 'badge-estado-cancelado' },
  }
  return map[estado] || { label: estado, cls: '' }
}

export function categoriaBadge(cat) {
  const norm = (s) => (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
  const map = {
    'cafe':     { label: 'Café',     cls: 'badge-cat-cafe' },
    'bebida':   { label: 'Bebida',   cls: 'badge-cat-bebidas' },
    'pan':      { label: 'Pan',      cls: 'badge-cat-pan' },
    'sandwich': { label: 'Sándwich', cls: 'badge-cat-sandwich' },
    'otro':     { label: 'Otro',     cls: 'badge-cat-default' },
  }
  return map[norm(cat)] || { label: cat, cls: 'badge-cat-default' }
}

export function generarMeses() {
  const meses = []
  const ahora = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    const labelCapital = label.charAt(0).toUpperCase() + label.slice(1)
    meses.push({
      label: labelCapital,
      desde: d.toISOString().split('T')[0],
      hasta: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
    })
  }
  return meses
}

// ============================================================
// CAFÉ+ — API Client v2
// fetch nativo sin headers — evita preflight CORS con Apps Script
// ============================================================

const BASE = import.meta.env.VITE_API_URL
const N8N  = import.meta.env.VITE_N8N_WEBHOOK

function getToken() {
  return localStorage.getItem('cafe_token') || ''
}

// Fetch con timeout configurable (default 25s — Apps Script puede tardar)
async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado. Apps Script tardó demasiado.')
    throw err
  }
}

async function apiGet(action, params = {}) {
  const url = new URL(BASE)
  url.searchParams.set('action', action)
  url.searchParams.set('token', getToken())
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const res = await fetchWithTimeout(url.toString())
  return res.json()
}

async function apiPost(action, body = {}) {
  const url = `${BASE}?action=${action}&token=${getToken()}`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.json()
}

export const auth = {
  login: (usuario, password) =>
    fetchWithTimeout(`${BASE}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    }, 20000).then(r => r.json()),

  validateToken: (token) =>
    fetchWithTimeout(`${BASE}?action=validateToken&token=${token}`, {}, 15000)
      .then(r => r.json()),
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
  // sin_detalle=true → GAS omite el join con DetallePedidos (mucho más rápido para listas)
  getAll:       (params = {}) => apiGet('getPedidos', { ...params, sin_detalle: 'true' }),
  getHoy:       (params = {}) => apiGet('getPedidos', { ...params, sin_detalle: 'true' }),
  getById:      (id)          => apiGet('getPedidoById', { id }),
  create:       (data)        => apiPost('createPedido', data),
  updateEstado: (id, estado)  => apiPost('updateEstado', { id_pedido: id, estado }),
}

export const analytics = {
  getPeriodo: (desde, hasta) =>
    apiGet('getAnalytics', { fecha_desde: desde, fecha_hasta: hasta }),
}

export const agente = {
  analizar: (payload) =>
    fetch(`${N8N}/analizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json()),

  chat: (mensaje, contexto) =>
    fetch(`${N8N}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje, contexto }),
    }).then(r => r.json()),
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

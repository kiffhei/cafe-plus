// ============================================================
// CAFÉ+ — API Client
// Usa fetch nativo (sin axios) para evitar preflight CORS con Apps Script
// ============================================================

const BASE = import.meta.env.VITE_API_URL
const N8N  = import.meta.env.VITE_N8N_WEBHOOK

function getToken() {
  return localStorage.getItem('cafe_token') || ''
}

async function apiGet(action, params = {}) {
  const url = new URL(BASE)
  url.searchParams.set('action', action)
  url.searchParams.set('token', getToken())
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString())
  return res.json()
}

async function apiPost(action, body = {}) {
  const url = `${BASE}?action=${action}&token=${getToken()}`
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.json()
}

export const auth = {
  login: (usuario, password) =>
    fe    fe    fe    fe    fe    fe    fe    fe    fe    fe    fedy: JSON.stringify({ usuario, password }),
    }).then(r => r.json()),
}

export const usuarios = {
  ge All:  ()           => apiGet('getUsuarios'),
  create:  (data)       => apiPost('createUsuario', data),
  update:  (data)       => apiPost('updateUsuario', data),
  toggle:  (  toggle:  (=> apiPost('toggleUsuario', { id_usuario: id, activo }),
}

export const productos = {
  getAll:  (params = {}) => apiGet('getProductos', params),
  create:  (data)        => apiPost('createProducto', data),
  update:  (data)        => apiPost('updateProducto', data),
  toggle:  (id, activo)  => apiPost('toggleProducto', { id_producto: id, activo }),
}

export const clientes = {
  getAll:      (params = {}) => apiGet('getClientes', params),
  create:      (data)        => apiPost('createCliente  create:      (data)        =)        => apiPost('updateCliente', data),
  toggle:      (id, activo)  => apiPost('toggleCliente', { id_cliente: id, activo }),
  sumarVisita: (id)          => apiPost('sumarVisita', { id_cliente: id }),
}

export const pedidos = {
  getAll:       (params = {}) => apiGet('getPedidos', params),
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
      headers      headers      headers      headers      headers      headers      headers     }).then(r => r.json()),
  chat  chat  chat  chat  chat  chat  chat  chat  chat  chat  ch`, {
  chat  chat  chat  chat  chat  chat  chat  chat  chat  chat  ch`, {
  headers      headers     }).then(r => r.json()),
rial, corial, corial, corial, corial, corial, corial, corial, corial, corial, corial, corialrnrial, corial, corial, corial, corial, corial, corial, corial, corial, cor minimrial, corial, corial, c})rial, corial, corial, corial, corial, corial, coria(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  re  re  re  re  re  re  re  re  re  re  re  re  re  re  re  re  nt  re  re  re  re  re  re  re  re  re  re  re  re  re  re  re  re  nt  re  re  re  r'Amer  re  re  re  re  re  reorm  re  re  re  re  re  re  re  tF  re  re  re  re  re  re  re  re  re  re  re  re  re  re  re  re  w Date(fechaStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(d)
}

export function canalBadge(canal) {
  const map = {
    local:    { label: 'Local',     cls: 'badge-canal-local' },
    didi:     { label: 'DiDi Food', cls: 'badge-canal-didi' },
    rappi:    { label: 'Rappi',     cls: 'badge-canal-rapp    rappi:    { label: 'Rappi',     cls: 'badge-canal-rapp    rappi:    { label: 'Rappi',     cls: 'badge-canal-rapp    rappi:    { label: 'Rappi',     cls: 'badge-canal-rapp    rappi:    { label: 'Rappi',     cls: 'badge-canal-rapp    rappi:    { label: 'Rappla    rappi:    { label: 'Rbadge-estado-pendiente' },
    preparacion: { label: 'En prep.',   cls: 'badge-estado-preparacion' },
    entregado:   { label: 'Entregado',  cls: 'badge-estado-entregado' },
    cancelado:   { label: 'Cancelado',  cls: 'badge-estado-cancelado' },
  }
  return map[estado] || { label: estado, cls: '' }
}

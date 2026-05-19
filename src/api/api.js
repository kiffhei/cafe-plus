import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
const N8N  = import.meta.env.VITE_N8N_WEBHOOK

function getToken() {
  return localStorage.getItem('cafe_token') || ''
}

async function apiGet(action, params = {}) {
  const res = await axios.get(BASE, {
    params: { action, token: getToken(), ...params }
  })
  return res.data
}

async function apiPost(action, body = {}) {
  const res = await axios.post(
    `${BASE}?action=${action}&token=${getToken()}`,
    body,
    { headers: { 'Content-Type': 'text/plain' } }
  )
  return res.data
}

export const auth = {
  login: (usuario, password) =>
    axios.post(
      `${BASE}?action=login`,
      { usuario, password },
      { headers: { 'Content-Type': 'text/plain' } }
    ).then(r => r.data),
}

export const usuarios = {
  getAll:  ()     => apiGet('getUsuarios'),
  create:  (data) => apiPost('createUsuario', data),
  update:  (data) => apiPost('updateUsuario', data),
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
  getAll:       (params = {}) => apiGet('getPedidos', params),
  getById:      (id)          => apiGet('getPedidoById', { id }),
  create:       (data)        => apiPost('createPedido', data),
  updateEstado: (id, estado)  => apiPost('updateEstado', { id_pedido: id, estado }),
}

export const analytics = {
  getPeriodo: (desde, hasta) => apiGet('getAnalytics', { fecha_desde: desde, fecha_hasta: hasta }),
}

export const agente = {
  analizar: (payload) => axios.post(N8N + '/analizar', payload).then(r => r.data),
  chat: (mensaje, historial, contexto) =>
    axios.post(N8N + '/chat', { mensaje, historial, contexto }).then(r => r.data),
}

export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Mexico_City'
  }).format(d)
}

export function canalBadge(canal) {
  const map = {
    local:    { label: 'Local',     cls: 'badge-canal-local' },
    didi:     { label: 'DiDi Food', cls: 'badge-canal-didi' },
    rappi:    { label: 'Rappi',     cls: 'badge-canal-rappi' },
    ubereats: { label: 'Uber Eats', cls: 'badge-canal-ubereats' },
  }
  return map[canal] || { label: canal, cls: 'bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full' }
}

export function estadoBadge(estado) {
  const map = {
    pendiente:   { label: 'Pendiente',  cls: 'badge-estado-pendiente' },
    preparacion: { label: 'En prep.',   cls: 'badge-estado-preparacion' },
    entregado:   { label: 'Entregado',  cls: 'badge-estado-entregado' },
    cancelado:   { label: 'Cancelado',  cls: 'badge-estado-cancelado' },
  }
  return map[estado] || { label: estado, cls: '' }
}

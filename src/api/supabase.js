// ============================================================
// CAFÉ+ — API Client v2 (backend Supabase)
// Mismas firmas que api.js — las 7 páginas no cambian.
// Identidad real: Clerk. Supabase es capa de datos, protegida por RLS
// contra el claim "categoria" inyectado en el session token de Clerk.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import {
  formatMXN, formatFecha, formatFechaHora,
  canalBadge, estadoBadge, categoriaBadge, generarMeses,
} from './sheets'

export { formatMXN, formatFecha, formatFechaHora, canalBadge, estadoBadge, categoriaBadge, generarMeses }

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    // Clerk no se consume por hook aquí (módulo plano, no componente) —
    // se usa la instancia global que @clerk/clerk-react adjunta a window
    // una vez cargada la sesión. Patrón documentado por Supabase para JS vanilla.
    accessToken: async () => {
      try {
        return (await window.Clerk?.session?.getToken()) ?? null
      } catch {
        return null
      }
    },
  }
)

function ok(data) { return { ok: true, data } }
function fail(error) { return { ok: false, message: error?.message || 'Error de conexión' } }

function getUserMeta() {
  try {
    const raw = localStorage.getItem('clerk_user_meta')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Genera el siguiente ID secuencial de un prefijo (ej. PRD-004).
// Suficiente para el volumen de una demo — no es a prueba de condiciones
// de carrera concurrentes, que no aplican a este escenario de portafolio.
async function nextId(table, column, prefix, pad = 3) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .ilike(column, `${prefix}-%`)
    .order(column, { ascending: false })
    .limit(1)
  if (error) throw error
  const last = data?.[0]?.[column]
  const n = last ? parseInt(last.split('-')[1], 10) + 1 : 1
  return `${prefix}-${String(n).padStart(pad, '0')}`
}

// El backend Supabase no usa appToken de GAS — Clerk firma el JWT que
// consume directamente el cliente Supabase (ver accessToken arriba).
// Se mantiene el mismo contrato que api.js para que AuthContext.jsx
// funcione sin cambios sin importar el backend activo.
export const auth = {
  clerkExchange: async () => ({ ok: false }),
}

export const usuarios = {
  async getAll() {
    const { data, error } = await supabase.from('bd_usuarios').select('*').order('nombre')
    return error ? fail(error) : ok(data)
  },
  async create({ nombre, apellidos, categoria, usuario }) {
    try {
      const id_usuario = await nextId('bd_usuarios', 'id_usuario', 'USR')
      const { data, error } = await supabase.from('bd_usuarios')
        .insert({ id_usuario, nombre, apellidos, categoria, usuario, activo: true })
        .select().single()
      return error ? fail(error) : ok(data)
    } catch (error) { return fail(error) }
  },
  async update({ id_usuario, nombre, apellidos, categoria }) {
    const { data, error } = await supabase.from('bd_usuarios')
      .update({ nombre, apellidos, categoria })
      .eq('id_usuario', id_usuario)
      .select().single()
    return error ? fail(error) : ok(data)
  },
  async toggle(id, activo) {
    const { data, error } = await supabase.from('bd_usuarios')
      .update({ activo })
      .eq('id_usuario', id)
      .select().single()
    return error ? fail(error) : ok(data)
  },
}

export const productos = {
  async getAll(params = {}) {
    let q = supabase.from('bd_productos').select('*').order('nombre')
    if (params.categoria) q = q.eq('categoria', params.categoria)
    const { data, error } = await q
    return error ? fail(error) : ok(data)
  },
  async create({ nombre, categoria, precio_venta, costo, cantidad_stock }) {
    try {
      const id_producto = await nextId('bd_productos', 'id_producto', 'PRD')
      const { data, error } = await supabase.from('bd_productos')
        .insert({ id_producto, nombre, categoria, precio_venta, costo, cantidad_stock, activo: true })
        .select().single()
      return error ? fail(error) : ok(data)
    } catch (error) { return fail(error) }
  },
  async update({ id_producto, ...rest }) {
    const { data, error } = await supabase.from('bd_productos')
      .update(rest).eq('id_producto', id_producto).select().single()
    return error ? fail(error) : ok(data)
  },
  async toggle(id, activo) {
    const { data, error } = await supabase.from('bd_productos')
      .update({ activo }).eq('id_producto', id).select().single()
    return error ? fail(error) : ok(data)
  },
}

export const clientes = {
  async getAll(params = {}) {
    let q = supabase.from('bd_clientes').select('*').order('nombre')
    if (params.activo !== undefined) q = q.eq('activo', params.activo === 'true' || params.activo === true)
    const { data, error } = await q
    return error ? fail(error) : ok(data)
  },
  async create({ nombre, apellidos, telefono, email, descuento_fijo }) {
    try {
      const id_cliente = await nextId('bd_clientes', 'id_cliente', 'CLI')
      const { data, error } = await supabase.from('bd_clientes')
        .insert({
          id_cliente, nombre, apellidos, telefono, email,
          descuento_fijo: descuento_fijo || 0, visitas_acumuladas: 0, activo: true,
        })
        .select().single()
      return error ? fail(error) : ok(data)
    } catch (error) { return fail(error) }
  },
  async update({ id_cliente, ...rest }) {
    const { data, error } = await supabase.from('bd_clientes')
      .update(rest).eq('id_cliente', id_cliente).select().single()
    return error ? fail(error) : ok(data)
  },
  async toggle(id, activo) {
    const { data, error } = await supabase.from('bd_clientes')
      .update({ activo }).eq('id_cliente', id).select().single()
    return error ? fail(error) : ok(data)
  },
  async sumarVisita(id) {
    const { data: cliente, error: e1 } = await supabase.from('bd_clientes')
      .select('visitas_acumuladas').eq('id_cliente', id).single()
    if (e1) return fail(e1)
    const { data, error } = await supabase.from('bd_clientes')
      .update({ visitas_acumuladas: (cliente.visitas_acumuladas || 0) + 1 })
      .eq('id_cliente', id).select().single()
    return error ? fail(error) : ok(data)
  },
}

function aplicarFiltrosPedido(query, params = {}) {
  let q = query
  if (params.fecha_desde) q = q.gte('fecha_hora', params.fecha_desde)
  if (params.fecha_hasta) q = q.lte('fecha_hora', `${params.fecha_hasta}T23:59:59`)
  if (params.canal) q = q.eq('canal', params.canal)
  if (params.estado) q = q.eq('estado', params.estado)
  if (params.id_cliente) q = q.eq('id_cliente', params.id_cliente)
  return q
}

// PostgREST corta cualquier select sin rango explícito en 1000 filas — un periodo con
// más pedidos que eso queda truncado en silencio (sin error), así que los conteos y
// comparativos mienten. Se pagina en bloques de 1000 hasta que una página vuelve
// incompleta, acumulando el resultado completo.
const PAGE_SIZE = 1000

async function fetchAllPaginado(buildQuery) {
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) throw error
    all = [...all, ...(data || [])]
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

export const pedidos = {
  async getAll(params = {}) {
    try {
      const data = await fetchAllPaginado((from, to) =>
        aplicarFiltrosPedido(
          supabase.from('bd_ventas').select('*').order('fecha_hora', { ascending: false }),
          params
        ).range(from, to)
      )
      return ok(data)
    } catch (error) {
      return fail(error)
    }
  },
  async getHoy(params = {}) {
    return pedidos.getAll(params)
  },
  async getAllDetalle(params = {}) {
    try {
      const data = await fetchAllPaginado((from, to) =>
        aplicarFiltrosPedido(
          supabase.from('bd_ventas').select('*, items:bd_detalle_pedidos(*)').order('fecha_hora', { ascending: false }),
          params
        ).range(from, to)
      )
      return ok(data)
    } catch (error) {
      return fail(error)
    }
  },
  async getById(id) {
    const { data, error } = await supabase.from('bd_ventas')
      .select('*, items:bd_detalle_pedidos(*)')
      .eq('id_pedido', id)
      .single()
    return error ? fail(error) : ok(data)
  },
  async create(data) {
    try {
      const meta = getUserMeta()
      const { items = [], id_cliente, canal, descuento_aplicado = 0, estado = 'pendiente' } = data
      const detalle = items.map(i => ({
        id_producto: i.id_producto,
        nombre_producto: i.nombre_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal_linea: i.cantidad * i.precio_unitario,
      }))
      const subtotal = detalle.reduce((acc, i) => acc + i.subtotal_linea, 0)
      const descuento = descuento_aplicado
      const total = subtotal - descuento

      const id_pedido = await nextId('bd_ventas', 'id_pedido', 'PED', 5)
      const { error: ventaError } = await supabase.from('bd_ventas').insert({
        id_pedido,
        id_cajero: meta.id_usuario || '',
        nombre_cajero: meta.nombre || '',
        id_cliente: id_cliente || null,
        canal,
        subtotal,
        descuento,
        total,
        estado,
      })
      if (ventaError) return fail(ventaError)

      if (detalle.length) {
        const { error: detalleError } = await supabase.from('bd_detalle_pedidos')
          .insert(detalle.map(i => ({ ...i, id_pedido })))
        if (detalleError) return fail(detalleError)
      }
      return ok({ id_pedido })
    } catch (error) { return fail(error) }
  },
  async updateEstado(id, estado) {
    const { data, error } = await supabase.from('bd_ventas')
      .update({ estado }).eq('id_pedido', id).select().single()
    return error ? fail(error) : ok(data)
  },
}

export const analytics = {
  async getPeriodo(desde, hasta) {
    const { data, error } = await supabase.from('bd_ventas')
      .select('*, items:bd_detalle_pedidos(*)')
      .gte('fecha_hora', desde)
      .lte('fecha_hora', `${hasta}T23:59:59`)
    return error ? fail(error) : ok(data)
  },
}

// ── Lógica de promos de cliente frecuente ─────────────────────────
// Pura y testeable. La consume NuevoPedido al construir el pedido.

const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Regalo por hito de visitas. Se evalúa ANTES de incrementar la visita
 * actual: visitas=4 significa que ESTA es la visita 5, etc.
 * @returns {{ categoria: string, cantidad: number, label: string } | null}
 */
export function regaloPorVisitas(visitas) {
  if (visitas === 4)  return { categoria: 'cafe', cantidad: 1, label: '1 café gratis en esta visita (visita 5)' }
  if (visitas === 9)  return { categoria: 'pan',  cantidad: 1, label: '1 muffin gratis en esta visita (visita 10)' }
  if (visitas === 14) return { categoria: 'cafe', cantidad: 2, label: '2 cafés gratis en esta visita (visita 15)' }
  return null
}

/**
 * Traduce el regalo a un descuento en MXN: la suma de las N unidades
 * CUALIFICANTES más baratas que ya están en el carrito (N = regalo.cantidad).
 * Cualifica un ítem si su categoría normalizada coincide con regalo.categoria
 * (string) o está incluida en regalo.categoria (array — ej. aniversario, que
 * deja elegir entre pan o sandwich). Nunca descuenta más de lo que esos
 * productos cuestan (se topa a las unidades disponibles); si no hay ítem
 * cualificante, devuelve 0.
 *
 * @param {Array<{ producto: { precio_venta: number|string, categoria: string }, cantidad: number }>} carrito
 * @param {{ categoria: string|string[], cantidad: number } | null} regalo
 * @returns {number}
 */
export function calcularRegaloDescuento(carrito = [], regalo = null) {
  if (!regalo) return 0
  const categorias = Array.isArray(regalo.categoria) ? regalo.categoria : [regalo.categoria]
  const unidades = []
  for (const item of carrito) {
    if (!categorias.includes(norm(item.producto.categoria))) continue
    const precio = parseFloat(item.producto.precio_venta) || 0
    for (let i = 0; i < item.cantidad; i++) unidades.push(precio)
  }
  unidades.sort((a, b) => a - b)
  return unidades.slice(0, regalo.cantidad).reduce((s, p) => s + p, 0)
}

/**
 * Aplica varios regalos sobre el MISMO carrito sin que se reutilicen unidades:
 * si dos regalos piden la misma categoría (ej. visita + aniversario, ambos
 * 'pan'), el segundo solo puede tomar las unidades que el primero no usó.
 * Procesa `regalos` en el orden recibido — ese orden decide prioridad.
 *
 * @param {Array<{ producto: { precio_venta: number|string, categoria: string }, cantidad: number }>} carrito
 * @param {Array<{ categoria: string|string[], cantidad: number } | null>} regalos
 * @returns {{ total: number, porRegalo: number[] }}
 */
export function calcularRegalosMultiples(carrito = [], regalos = []) {
  const pool = []
  for (const item of carrito) {
    const cat = norm(item.producto.categoria)
    const precio = parseFloat(item.producto.precio_venta) || 0
    for (let i = 0; i < item.cantidad; i++) pool.push({ cat, precio, usada: false })
  }

  const porRegalo = regalos.map(regalo => {
    if (!regalo) return 0
    const categorias = Array.isArray(regalo.categoria) ? regalo.categoria : [regalo.categoria]
    const candidatos = pool
      .filter(u => !u.usada && categorias.includes(u.cat))
      .sort((a, b) => a.precio - b.precio)
      .slice(0, regalo.cantidad)
    candidatos.forEach(u => { u.usada = true })
    return candidatos.reduce((s, u) => s + u.precio, 0)
  })

  return { total: porRegalo.reduce((s, v) => s + v, 0), porRegalo }
}

/**
 * Regalo por aniversario de fidelidad (1 año, 2 años...). Se evalúa en cada
 * pedido y se dispara automáticamente — sin confirmación manual del cajero,
 * igual que regaloPorVisitas — en la primera compra posterior a cada
 * aniversario del registro del cliente. No escala con los años: siempre el
 * mismo obsequio (un pan o sandwich a elección), solo cambia la etiqueta.
 *
 * `ultimoCanjeado` (bd_clientes.ultimo_aniversario_canjeado) evita que el
 * mismo aniversario se regale en cada pedido durante todo el año siguiente:
 * una vez canjeado el aniversario N, no vuelve a aplicar hasta el N+1.
 *
 * @param {string|Date} fechaRegistro
 * @param {number|null|undefined} ultimoCanjeado
 * @param {Date} [hoy]
 * @returns {{ categoria: string[], cantidad: number, label: string, anio: number } | null}
 */
export function regaloPorAniversario(fechaRegistro, ultimoCanjeado, hoy = new Date()) {
  if (!fechaRegistro) return null
  const registro = new Date(fechaRegistro)
  if (Number.isNaN(registro.getTime())) return null

  let anios = hoy.getFullYear() - registro.getFullYear()
  const aunNoCumpleEsteAnio =
    hoy.getMonth() < registro.getMonth() ||
    (hoy.getMonth() === registro.getMonth() && hoy.getDate() < registro.getDate())
  if (aunNoCumpleEsteAnio) anios -= 1

  if (anios < 1) return null
  if (ultimoCanjeado && ultimoCanjeado >= anios) return null

  return {
    categoria: ['pan', 'sandwich'],
    cantidad: 1,
    label: `Regalo de aniversario — ${anios} año${anios > 1 ? 's' : ''} fidelizado`,
    anio: anios,
  }
}

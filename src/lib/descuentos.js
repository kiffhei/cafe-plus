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
 * Cualifica un ítem si su categoría normalizada coincide con regalo.categoria.
 * Nunca descuenta más de lo que esos productos cuestan (se topa a las unidades
 * disponibles); si no hay ítem cualificante, devuelve 0.
 *
 * @param {Array<{ producto: { precio_venta: number|string, categoria: string }, cantidad: number }>} carrito
 * @param {{ categoria: string, cantidad: number } | null} regalo
 * @returns {number}
 */
export function calcularRegaloDescuento(carrito = [], regalo = null) {
  if (!regalo) return 0
  const unidades = []
  for (const item of carrito) {
    if (norm(item.producto.categoria) !== regalo.categoria) continue
    const precio = parseFloat(item.producto.precio_venta) || 0
    for (let i = 0; i < item.cantidad; i++) unidades.push(precio)
  }
  unidades.sort((a, b) => a - b)
  return unidades.slice(0, regalo.cantidad).reduce((s, p) => s + p, 0)
}

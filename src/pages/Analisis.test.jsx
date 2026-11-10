import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import Analisis from './Analisis'
import { pedidos as pedidosApi } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// Analisis.jsx no tiene lógica condicional por rol (admin/cajero) — confirmado
// por lectura completa del componente — así que useAuth solo se mockea para
// proveer `user.nombre` (usado en el payload del chat IA), sin escenarios de
// isAdmin/isCajero que probar.
vi.mock('../api/api', async () => {
  // formatMXN/formatFecha/canalBadge/generarMeses son funciones puras reales de
  // sheets.js — se preservan; solo se mockean las llamadas de red
  // (getAllDetalle para la carga principal, getAll para el comparativo de
  // periodos — dos métodos independientes de bd_ventas).
  const real = await vi.importActual('../api/api')
  return {
    ...real,
    pedidos: { getAllDetalle: vi.fn(), getAll: vi.fn() },
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

function itemsJSON(arr) {
  return JSON.stringify(arr)
}

// Fechas fijas de enero 2026 — el rango de fechas real (fecha_desde/fecha_hasta)
// que viaja al backend no filtra nada en el frontend (el backend ya filtró),
// así que los valores exactos de fecha_hora no necesitan coincidir con "hoy".
const PEDIDOS_MOCK = [
  {
    id_pedido: 'P-1', fecha_hora: '2026-01-15T10:00:00', estado: 'entregado',
    total: 100, canal: 'local', id_cliente: 'C-1',
    items: itemsJSON([
      { nombre_producto: 'Café Americano', categoria: 'cafe', cantidad: 2, precio_unitario: 35, subtotal_linea: 70 },
      { nombre_producto: 'Croissant', categoria: 'pan', cantidad: 1, precio_unitario: 28, subtotal_linea: 28 },
    ]),
  },
  {
    id_pedido: 'P-2', fecha_hora: '2026-01-16T11:00:00', estado: 'entregado',
    total: 50, canal: 'rappi', id_cliente: null,
    items: itemsJSON([
      { nombre_producto: 'Croissant', categoria: 'pan', cantidad: 1, precio_unitario: 28, subtotal_linea: 28 },
    ]),
  },
  {
    id_pedido: 'P-3', fecha_hora: '2026-01-17T09:00:00', estado: 'pendiente',
    total: 40, canal: 'local', id_cliente: null,
    items: itemsJSON([
      { nombre_producto: 'Café Americano', categoria: 'cafe', cantidad: 1, precio_unitario: 35, subtotal_linea: 35 },
    ]),
  },
]

// Pedidos para el comparativo de periodos (pedidosApi.getAll, vía
// obtenerMetricasPeriodo) — misma respuesta para ambos periodos (A y B), ya que
// las etiquetas de mes/año son dinámicas (dependen de la fecha real) y no se
// pueden hardcodear; solo se verifica el valor calculado, no el label.
const COMPARATIVO_MOCK = [
  { estado: 'entregado', total: 200 },
  { estado: 'entregado', total: 100 },
  { estado: 'pendiente', total: 50 },
]

beforeEach(() => {
  vi.clearAllMocks()
  pedidosApi.getAllDetalle.mockResolvedValue({ ok: true, data: PEDIDOS_MOCK })
  pedidosApi.getAll.mockResolvedValue({ ok: true, data: COMPARATIVO_MOCK })
  useAuth.mockReturnValue({ user: { nombre: 'Brian' } })
  useTheme.mockReturnValue({ tema: 'matcha', darkMode: true })
  // jsdom no implementa scrollIntoView — el chat IA lo usa para el auto-scroll
  // del historial de mensajes.
  Element.prototype.scrollIntoView = vi.fn()
  // jsdom no implementa ResizeObserver — recharts.ResponsiveContainer lo usa
  // para medir su contenedor; sin este stub, cada gráfica truena al montar.
  // Arrow function no sirve aquí (recharts invoca `new ResizeObserver(...)`,
  // y una arrow function no puede usarse como constructor — mismo gotcha que
  // el mock de jsPDF en Historial.test.jsx).
  globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Analisis', () => {
  it('muestra tarjetas de carga (skeleton) mientras obtiene los datos del periodo', () => {
    render(<Analisis />)
    expect(document.querySelectorAll('.skeleton-theme').length).toBeGreaterThan(0)
  })

  it('calcula y muestra los KPIs tras cargar correctamente', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Total ventas').parentElement.nextSibling)
      .toHaveTextContent('$150.00')) // 100 + 50, solo entregados
    // "Ticket promedio" también es la etiqueta de una tarjeta del comparativo de
    // periodos más abajo — se toma la primera aparición (la del grid de KPIs,
    // que en el DOM se renderiza antes que el comparativo).
    expect(screen.getAllByText('Ticket promedio')[0].parentElement.nextSibling).toHaveTextContent('$75.00')
    expect(screen.getByText('Total pedidos').parentElement.nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Canal top').parentElement.nextSibling).toHaveTextContent('Local')
    expect(screen.getByText('Producto top').parentElement.nextSibling).toHaveTextContent('Café Americano')
  })

  it('muestra "Error: <mensaje>" si getAllDetalle responde ok:false', async () => {
    pedidosApi.getAllDetalle.mockResolvedValue({ ok: false, message: 'Sin permisos' })
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Error: Sin permisos')).toBeInTheDocument())
  })

  it('muestra "Error de conexión:" si getAllDetalle lanza una excepción', async () => {
    pedidosApi.getAllDetalle.mockRejectedValue(new Error('network down'))
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Error de conexión: network down')).toBeInTheDocument())
  })

  it('muestra "Sin datos de ventas en este periodo" cuando no hay pedidos entregados', async () => {
    pedidosApi.getAllDetalle.mockResolvedValue({ ok: true, data: [] })
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Sin datos de ventas en este periodo')).toBeInTheDocument())
  })

  it('muestra las tarjetas de "Más vendido" y "Menos vendido" del periodo', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Más vendido')).toBeInTheDocument())
    // "Café Americano" también es el valor del KPI "Producto top" — se acota la
    // búsqueda a la propia tarjeta ("Más vendido" y su nombre comparten la misma
    // tarjeta .relative.rounded-2xl).
    const tarjetaTop = screen.getByText('Más vendido').closest('.relative.rounded-2xl')
    expect(within(tarjetaTop).getByText('Café Americano')).toBeInTheDocument() // más vendido: qty 3
    const tarjetaMenos = screen.getByText('Menos vendido').closest('.relative.rounded-2xl')
    expect(within(tarjetaMenos).getByText('Croissant')).toBeInTheDocument() // menos vendido: qty 2
  })

  it('cambiar a "Este mes" vuelve a llamar a getAllDetalle con un rango distinto', async () => {
    render(<Analisis />)
    await waitFor(() => expect(pedidosApi.getAllDetalle).toHaveBeenCalledTimes(1))
    const llamadaInicial = pedidosApi.getAllDetalle.mock.calls[0][0]

    fireEvent.click(screen.getByText('Este mes'))
    await waitFor(() => expect(pedidosApi.getAllDetalle).toHaveBeenCalledTimes(2))
    const llamadaNueva = pedidosApi.getAllDetalle.mock.calls[1][0]
    expect(llamadaNueva).not.toEqual(llamadaInicial)
  })

  it('el modo "Personalizado" permite elegir fechas y "Aplicar" recarga con ese rango', async () => {
    render(<Analisis />)
    await waitFor(() => expect(pedidosApi.getAllDetalle).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByText('Personalizado'))
    const inputs = document.querySelectorAll('input[type="date"]')
    fireEvent.change(inputs[0], { target: { value: '2026-02-01' } })
    fireEvent.change(inputs[1], { target: { value: '2026-02-05' } })
    fireEvent.click(screen.getByText('Aplicar'))

    await waitFor(() => expect(pedidosApi.getAllDetalle).toHaveBeenCalledWith(
      expect.objectContaining({ fecha_desde: '2026-02-01', fecha_hasta: '2026-02-05' })
    ))
  })

  it('alternar "Top 5 productos" entre Unidades y Monto no rompe el render', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Top 5 productos')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Monto'))
    expect(screen.getByText('Top 5 productos')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Unidades'))
    expect(screen.getByText('Top 5 productos')).toBeInTheDocument()
  })

  it('muestra las tarjetas de "Canales de venta" con pedidos y ventas por canal', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Canales de venta')).toBeInTheDocument())
    // "Local" también es el valor del KPI "Canal top" — se acota la búsqueda a
    // la sección de tarjetas de canal (el <div> que envuelve el <h3> y el grid).
    const seccion = screen.getByText('Canales de venta').closest('div')
    expect(within(seccion).getByText('Local')).toBeInTheDocument()
    expect(within(seccion).getByText('Rappi')).toBeInTheDocument()
    expect(within(seccion).getByText('2 pedidos')).toBeInTheDocument() // canal local: P-1 y P-3
    expect(within(seccion).getByText('1 pedidos')).toBeInTheDocument() // canal rappi: P-2
  })

  it('muestra las tarjetas del comparativo de periodos tras cargar', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Ventas totales')).toBeInTheDocument())
    expect(screen.getByText('Pedidos')).toBeInTheDocument()
    // "Ticket promedio" aparece dos veces: la tarjeta KPI y la tarjeta del
    // comparativo — se verifica que haya exactamente esas dos apariciones.
    expect(screen.getAllByText('Ticket promedio')).toHaveLength(2)
  })

  it('cambiar el modo del comparativo a "Año vs. año anterior" dispara una nueva carga', async () => {
    render(<Analisis />)
    await waitFor(() => expect(pedidosApi.getAll).toHaveBeenCalledTimes(2)) // periodo A + B inicial

    fireEvent.click(screen.getByText('Año vs. año anterior'))
    await waitFor(() => expect(pedidosApi.getAll).toHaveBeenCalledTimes(4)) // nuevo par A + B
  })

  it('muestra el error de conexión del comparativo si getAll falla', async () => {
    pedidosApi.getAll.mockRejectedValue(new Error('network down'))
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Error de conexión: network down')).toBeInTheDocument())
  })

  it('muestra los radares de "Clientes sin registro" y "Clientes fidelizados" cuando hay visitas', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Clientes sin registro · Local')).toBeInTheDocument())
    expect(screen.getByText('Clientes fidelizados · Local')).toBeInTheDocument()
  })

  it('muestra la sección "Pedidos por hora del día" cuando hay pedidos en el periodo', async () => {
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Pedidos por hora del día')).toBeInTheDocument())
  })

  it('al hacer clic en un chip de pregunta rápida, envía el mensaje y muestra la respuesta del agente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ respuesta: 'El producto top fue el Café Americano.' })),
    }))
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Total ventas').parentElement).toBeInTheDocument())
    fireEvent.click(screen.getByText('¿Cuál fue el producto más vendido?'))

    await waitFor(() => expect(screen.getByText('El producto top fue el Café Americano.')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('si el fetch del chat falla, muestra el mensaje de error de conexión del agente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    render(<Analisis />)
    await waitFor(() => expect(screen.getByText('Total ventas').parentElement).toBeInTheDocument())
    fireEvent.click(screen.getByText('¿En qué canal vendemos más?'))

    await waitFor(() => expect(screen.getByText(
      'Error al conectar con el agente IA. Verifica que el webhook de n8n esté activo.'
    )).toBeInTheDocument())
  })
})

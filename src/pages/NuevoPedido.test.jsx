import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import NuevoPedido from './NuevoPedido'
import { productos as productosApi, clientes as clientesApi, pedidos as pedidosApi } from '../api/api'
import { useTheme } from '../context/ThemeContext'

// formatMXN es una función pura real de sheets.js — se preserva; solo se
// mockean las llamadas de red (productos, clientes, pedidos). getProductImage/
// handleProductImageError (productImages.js) y las funciones de regalos
// (descuentos.js) también son puras reales: se dejan sin mockear para
// ejercitar su comportamiento real a través del componente.
vi.mock('../api/api', async () => {
  const real = await vi.importActual('../api/api')
  return {
    ...real,
    productos: { getAll: vi.fn() },
    clientes:  { getAll: vi.fn(), update: vi.fn() },
    pedidos:   { create: vi.fn() },
  }
})

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

const CATALOGO_MOCK = [
  { id_producto: 'P-1', nombre: 'Café Americano', categoria: 'cafe', precio_venta: 35, activo: true },
  { id_producto: 'P-2', nombre: 'Croissant', categoria: 'pan', precio_venta: 28, activo: true },
]

function clienteBase(overrides = {}) {
  return {
    id_cliente: 'C-1', nombre: 'María', apellidos: 'López', telefono: '5511112222',
    visitas_acumuladas: 0, activo: true, es_cumpleanos: false,
    fecha_registro: '2026-01-01', // reciente: no dispara regalo de aniversario
    ...overrides,
  }
}

function renderNuevoPedido() {
  return render(
    <MemoryRouter initialEntries={['/pedido']}>
      <Routes>
        <Route path="/pedido" element={<NuevoPedido />} />
        <Route path="/pedidos-hoy" element={<div>pantalla pedidos de hoy</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  productosApi.getAll.mockResolvedValue({ ok: true, data: CATALOGO_MOCK })
  clientesApi.getAll.mockResolvedValue({ ok: true, data: [] })
  useTheme.mockReturnValue({ darkMode: true })
})

describe('NuevoPedido', () => {
  it('muestra "Cargando..." mientras obtiene el catálogo', () => {
    renderNuevoPedido()
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('muestra el catálogo de productos tras cargar correctamente', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })

  it('el botón de confirmar está deshabilitado cuando el carrito está vacío', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    expect(screen.getByText('Selecciona productos del catálogo')).toBeInTheDocument()
    expect(screen.getByText(/Confirmar pedido/).closest('button')).toBeDisabled()
  })

  it('agregar un producto lo suma al carrito y habilita confirmar', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    expect(screen.getByText(/Confirmar pedido/).closest('button')).not.toBeDisabled()
    expect(screen.getByText('Subtotal').nextSibling).toHaveTextContent('$35.00')
  })

  it('filtra el catálogo por texto del buscador', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'croissant' } })
    expect(screen.queryByText('Café Americano')).not.toBeInTheDocument()
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })

  it('filtra el catálogo por categoría al hacer clic en el chip', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Pan' }))
    expect(screen.queryByText('Café Americano')).not.toBeInTheDocument()
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })

  it('incrementar y decrementar la cantidad de un producto en el carrito actualiza el subtotal', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.click(screen.getByText('+'))
    expect(screen.getByText('Subtotal').nextSibling).toHaveTextContent('$70.00') // 2x35
    fireEvent.click(screen.getByText('−'))
    expect(screen.getByText('Subtotal').nextSibling).toHaveTextContent('$35.00')
  })

  it('buscar y seleccionar un cliente aplica 5% de descuento', async () => {
    clientesApi.getAll.mockResolvedValue({ ok: true, data: [clienteBase()] })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...'), { target: { value: 'ma' } })
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByText('María López'))

    expect(screen.getByText('5% descuento')).toBeInTheDocument()
    expect(screen.getByText('−$1.75')).toBeInTheDocument() // 5% de 35
  })

  it('un cliente con cumpleaños hoy aplica 30% de descuento', async () => {
    clientesApi.getAll.mockResolvedValue({ ok: true, data: [clienteBase({ es_cumpleanos: true })] })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...'), { target: { value: 'ma' } })
    // El 🎂 se agrega como cuarto nodo de texto cuando es_cumpleanos es true,
    // así que el nombre completo ya no es "María López" exacto — se matchea
    // por regex.
    await waitFor(() => expect(screen.getByText(/María López/)).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByText(/María López/))

    expect(screen.getByText('30% descuento')).toBeInTheDocument()
    expect(screen.getByText('−$10.50')).toBeInTheDocument() // 30% de 35
  })

  it('quitar el cliente seleccionado elimina el descuento aplicado', async () => {
    clientesApi.getAll.mockResolvedValue({ ok: true, data: [clienteBase()] })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...'), { target: { value: 'ma' } })
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByText('María López'))
    expect(screen.getByText('5% descuento')).toBeInTheDocument()

    fireEvent.click(screen.getByText('×'))
    expect(screen.queryByText('5% descuento')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...')).toBeInTheDocument()
  })

  it('un cliente en su 5ta visita muestra el banner de regalo por visitas', async () => {
    clientesApi.getAll.mockResolvedValue({ ok: true, data: [clienteBase({ visitas_acumuladas: 4 })] })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...'), { target: { value: 'ma' } })
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByText('María López'))

    expect(screen.getByText(/1 café gratis en esta visita/)).toBeInTheDocument()
  })

  it('confirmar un pedido llama a pedidosApi.create y muestra la pantalla de éxito', async () => {
    pedidosApi.create.mockResolvedValue({ ok: true, data: { id_pedido: 'PED-99', total: 35 } })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.click(screen.getByText(/Confirmar pedido/))

    await waitFor(() => expect(pedidosApi.create).toHaveBeenCalledWith(expect.objectContaining({
      canal: 'local',
      id_cliente: '',
      items: [expect.objectContaining({ id_producto: 'P-1', cantidad: 1 })],
    })))
    await waitFor(() => expect(screen.getByText('¡Pedido creado!')).toBeInTheDocument())
    expect(screen.getByText('PED-99')).toBeInTheDocument()
  })

  it('la pantalla de éxito navega a /pedidos-hoy al hacer clic en "Ver pedidos del día"', async () => {
    pedidosApi.create.mockResolvedValue({ ok: true, data: { id_pedido: 'PED-99', total: 35 } })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.click(screen.getByText(/Confirmar pedido/))
    await waitFor(() => expect(screen.getByText('¡Pedido creado!')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Ver pedidos del día →'))
    expect(screen.getByText('pantalla pedidos de hoy')).toBeInTheDocument()
  })

  it('muestra el mensaje de error del servidor si pedidosApi.create responde ok:false', async () => {
    pedidosApi.create.mockResolvedValue({ ok: false, message: 'Sin stock' })
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.click(screen.getByText(/Confirmar pedido/))
    await waitFor(() => expect(screen.getByText('Sin stock')).toBeInTheDocument())
  })

  it('muestra "Error de conexión" si pedidosApi.create lanza una excepción', async () => {
    pedidosApi.create.mockRejectedValue(new Error('network down'))
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Café Americano'))
    fireEvent.click(screen.getByText(/Confirmar pedido/))
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeInTheDocument())
  })

  it('cambiar de canal actualiza el canal mostrado en el resumen del pedido', async () => {
    renderNuevoPedido()
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    expect(screen.getByText(/Local · 0 productos/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Rappi'))
    expect(screen.getByText(/Rappi · 0 productos/)).toBeInTheDocument()
  })
})

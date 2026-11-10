import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PedidosHoy from './PedidosHoy'
import { pedidos as pedidosApi } from '../api/api'

vi.mock('../api/api', async () => {
  // formatMXN/formatFecha/canalBadge/estadoBadge son funciones puras reales
  // de sheets.js — se preservan para no desacoplar la suite de su
  // comportamiento real; solo se mockea la llamada de red a pedidos.
  const real = await vi.importActual('../api/api')
  return {
    ...real,
    pedidos: { getAll: vi.fn(), updateEstado: vi.fn() },
  }
})

const PEDIDOS_MOCK = [
  {
    id_pedido: 'PED-1', estado: 'pendiente', canal: 'local', nombre_cliente: 'Juan',
    items: JSON.stringify([{ cantidad: 2, nombre_producto: 'Latte', precio_unitario: 35 }]),
    total: 70, fecha_hora: '2026-01-01T10:00:00', notas: '',
  },
  {
    id_pedido: 'PED-2', estado: 'entregado', canal: 'delivery', nombre_cliente: '',
    items: [{ cantidad: 1, nombre_producto: 'Croissant', precio_unitario: 28 }],
    total: 28, fecha_hora: '2026-01-01T09:00:00',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  pedidosApi.getAll.mockResolvedValue({ ok: true, data: PEDIDOS_MOCK })
})

describe('PedidosHoy', () => {
  it('muestra tarjetas de carga (skeleton) mientras obtiene los pedidos del día', () => {
    render(<PedidosHoy />)
    expect(document.querySelectorAll('.skeleton-theme').length).toBeGreaterThan(0)
  })

  it('muestra las tarjetas de pedidos tras cargar correctamente', async () => {
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    expect(screen.getByText('#PED-2')).toBeInTheDocument()
    expect(screen.getByText('· Juan')).toBeInTheDocument()
    expect(screen.getByText(/Latte/)).toBeInTheDocument()
  })

  it('muestra "Error cargando pedidos" si la respuesta del servidor es ok:false', async () => {
    pedidosApi.getAll.mockResolvedValue({ ok: false })
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('Error cargando pedidos')).toBeInTheDocument())
  })

  it('muestra "Sin pedidos hoy todavía" cuando no hay pedidos', async () => {
    pedidosApi.getAll.mockResolvedValue({ ok: true, data: [] })
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('Sin pedidos hoy todavía')).toBeInTheDocument())
  })

  it('calcula las métricas de pendientes, entregados y venta del día', async () => {
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    expect(screen.getByText('Pendientes').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Entregados').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Venta del día').nextSibling).toHaveTextContent('$28.00')
  })

  it('filtra las tarjetas por estado al hacer clic en el chip correspondiente', async () => {
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Entregado/ }))
    expect(screen.queryByText('#PED-1')).not.toBeInTheDocument()
    expect(screen.getByText('#PED-2')).toBeInTheDocument()
  })

  it('un pedido pendiente avanza a "preparación" y llama a updateEstado', async () => {
    pedidosApi.updateEstado.mockResolvedValue({ ok: true })
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    fireEvent.click(screen.getByText('En preparación →'))
    await waitFor(() => expect(pedidosApi.updateEstado).toHaveBeenCalledWith('PED-1', 'preparacion'))
    await waitFor(() => expect(screen.getByText('Entregar ✓')).toBeInTheDocument())
  })

  it('cancelar un pedido llama a updateEstado con "cancelado"', async () => {
    pedidosApi.updateEstado.mockResolvedValue({ ok: true })
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Cancelar')[0])
    await waitFor(() => expect(pedidosApi.updateEstado).toHaveBeenCalledWith('PED-1', 'cancelado'))
  })

  it('un pedido entregado no muestra botones de cambio de estado', async () => {
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-2')).toBeInTheDocument())
    const tarjetaEntregada = screen.getByText('#PED-2').closest('div.modal-surface')
    expect(tarjetaEntregada.querySelector('button')).not.toBeInTheDocument()
  })

  it('el botón "Actualizar" vuelve a llamar a pedidosApi.getAll', async () => {
    render(<PedidosHoy />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    expect(pedidosApi.getAll).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Actualizar'))
    await waitFor(() => expect(pedidosApi.getAll).toHaveBeenCalledTimes(2))
  })
})

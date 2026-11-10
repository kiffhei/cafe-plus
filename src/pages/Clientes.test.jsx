import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Clientes from './Clientes'
import { clientes as clientesApi, pedidos as pedidosApi } from '../api/api'
import { useAuth } from '../context/AuthContext'

vi.mock('../api/api', async () => {
  // Los formatters (formatMXN, formatFecha, canalBadge, estadoBadge) son
  // funciones puras reales de sheets.js — se preservan para no desacoplar la
  // suite de su comportamiento real; solo se mockean las llamadas de red.
  const real = await vi.importActual('../api/api')
  return {
    ...real,
    clientes: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), toggle: vi.fn() },
    pedidos:  { getAll: vi.fn() },
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// El componente renderiza {c.nombre} {c.apellidos} como nodos de texto
// adyacentes dentro del mismo <div> — por eso las aserciones usan el nombre
// completo ("María López"), que es el texto que esa celda expone a Testing
// Library, en vez del nombre de pila solo.
const CLIENTES_MOCK = [
  { id_cliente: 'C-1', nombre: 'María', apellidos: 'López', telefono: '5511112222', email: 'maria@example.com', visitas_acumuladas: 5, activo: true, es_cumpleanos: false, fecha_registro: '2026-01-01' },
  { id_cliente: 'C-2', nombre: 'Ana', apellidos: 'Pérez', telefono: '5533334444', email: '', visitas_acumuladas: 0, activo: true, es_cumpleanos: true, fecha_registro: '2026-02-01' },
]

beforeEach(() => {
  vi.clearAllMocks()
  clientesApi.getAll.mockResolvedValue({ ok: true, data: CLIENTES_MOCK })
  useAuth.mockReturnValue({ isAdmin: true })
})

describe('Clientes', () => {
  it('muestra filas de carga (skeleton) mientras obtiene la lista', () => {
    render(<Clientes />)
    expect(document.querySelectorAll('.skeleton-theme').length).toBeGreaterThan(0)
  })

  it('muestra la lista de clientes tras cargar correctamente', async () => {
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
  })

  it('muestra el mensaje de error del servidor si getAll responde ok:false', async () => {
    clientesApi.getAll.mockResolvedValue({ ok: false, message: 'No autorizado' })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('No autorizado')).toBeInTheDocument())
  })

  it('muestra "Error de conexión" si getAll lanza una excepción', async () => {
    clientesApi.getAll.mockRejectedValue(new Error('network down'))
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeInTheDocument())
  })

  it('muestra "Aún no hay clientes registrados" cuando la lista está vacía', async () => {
    clientesApi.getAll.mockResolvedValue({ ok: true, data: [] })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('Aún no hay clientes registrados')).toBeInTheDocument())
  })

  it('filtra la lista por nombre o teléfono', async () => {
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o teléfono...'), { target: { value: 'ana' } })
    expect(screen.queryByText('María López')).not.toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
  })

  it('muestra "Sin clientes con ese criterio" cuando el filtro no coincide', async () => {
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o teléfono...'), { target: { value: 'zzz-no-existe' } })
    expect(screen.getByText('Sin clientes con ese criterio')).toBeInTheDocument()
  })

  it('muestra el banner de cumpleaños cuando hay clientes que cumplen años hoy', async () => {
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    expect(screen.getByText('1 cliente cumple años hoy')).toBeInTheDocument()
    expect(screen.getByText('Aplica 30% de descuento en toda la cuenta')).toBeInTheDocument()
  })

  it('un admin ve la columna de Estado y el toggle; un cajero no', async () => {
    const { unmount } = render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    expect(screen.getByText('Estado')).toBeInTheDocument()
    unmount()

    useAuth.mockReturnValue({ isAdmin: false })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
  })

  it('solo muestra "Ver pedidos" para clientes con visitas acumuladas', async () => {
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    expect(screen.getAllByText('Ver pedidos')).toHaveLength(1)
  })

  it('togglear el estado de un cliente llama a clientesApi.toggle', async () => {
    clientesApi.toggle.mockResolvedValue({ ok: true })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    const fila = screen.getByText('María López').closest('tr')
    const toggleBtn = fila.querySelector('button')
    fireEvent.click(toggleBtn)
    await waitFor(() => expect(clientesApi.toggle).toHaveBeenCalledWith('C-1', false))
  })

  it('valida que nombre, apellidos y teléfono sean requeridos antes de registrar', async () => {
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo cliente'))
    fireEvent.click(screen.getByText('Registrar cliente'))
    expect(screen.getByText('Nombre, apellidos y teléfono son requeridos')).toBeInTheDocument()
    expect(clientesApi.create).not.toHaveBeenCalled()
  })

  it('registra un cliente nuevo exitosamente y recarga la lista', async () => {
    clientesApi.create.mockResolvedValue({ ok: true })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo cliente'))
    fireEvent.change(screen.getByPlaceholderText('María'), { target: { value: 'Carla' } })
    fireEvent.change(screen.getByPlaceholderText('López García'), { target: { value: 'Ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('55 1234 5678'), { target: { value: '5599998888' } })
    fireEvent.click(screen.getByText('Registrar cliente'))

    await waitFor(() => expect(clientesApi.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Carla', apellidos: 'Ruiz', telefono: '5599998888',
    })))
  })

  it('editar un cliente existente llama a clientesApi.update con su id', async () => {
    clientesApi.update.mockResolvedValue({ ok: true })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Editar')[0])
    fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(clientesApi.update).toHaveBeenCalledWith(expect.objectContaining({
      id_cliente: 'C-1', nombre: 'María',
    })))
  })

  it('al abrir "Ver pedidos" muestra el historial de pedidos del cliente', async () => {
    pedidosApi.getAll.mockResolvedValue({
      ok: true,
      data: [{ id_pedido: 'PED-1', id_cliente: 'C-1', fecha_hora: '2026-05-01T10:00:00', canal: 'local', total: 120, estado: 'entregado' }],
    })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Ver pedidos'))
    expect(screen.getByText('Pedidos de María López')).toBeInTheDocument()
    await waitFor(() => expect(pedidosApi.getAll).toHaveBeenCalledWith({ id_cliente: 'C-1', limit: 10 }))
  })

  it('muestra "aún no tiene pedidos registrados" cuando el historial está vacío', async () => {
    pedidosApi.getAll.mockResolvedValue({ ok: true, data: [] })
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Ver pedidos'))
    await waitFor(() => expect(screen.getByText('Este cliente aún no tiene pedidos registrados')).toBeInTheDocument())
  })

  it('muestra el error de pedidos si pedidosApi.getAll falla', async () => {
    pedidosApi.getAll.mockRejectedValue(new Error('network down'))
    render(<Clientes />)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Ver pedidos'))
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeInTheDocument())
  })
})

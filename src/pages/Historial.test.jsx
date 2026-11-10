import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import Historial from './Historial'
import { pedidos as pedidosApi, usuarios as usuariosApi } from '../api/api'
import { useAuth } from '../context/AuthContext'

const saveMock = vi.fn()

// jsPDF genera un archivo real y dispara una descarga — se sustituye por un
// stub que solo expone los métodos que generarTicketPDF() invoca, para
// verificar que el flujo se ejecuta sin depender de la librería real.
// mockImplementation con arrow function falla aquí: Historial.jsx invoca
// `new jsPDF(...)`, y una arrow function no puede usarse como constructor.
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function () {
    return {
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      save: saveMock,
    }
  }),
}))

vi.mock('../api/api', async () => {
  // formatMXN/formatFecha/canalBadge/estadoBadge/categoriaBadge/generarMeses
  // son funciones puras reales de sheets.js — se preservan; solo se mockean
  // las llamadas de red (pedidos, usuarios).
  const real = await vi.importActual('../api/api')
  return {
    ...real,
    pedidos:  { getAll: vi.fn(), getById: vi.fn() },
    usuarios: { getAll: vi.fn() },
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function pedido(n, overrides = {}) {
  return {
    id_pedido: `PED-${n}`,
    fecha_hora: `2026-05-${String(n).padStart(2, '0')}T10:00:00`,
    nombre_cajero: 'Lupe',
    nombre_cliente: n === 1 ? 'Juan' : '',
    canal: 'local',
    estado: 'entregado',
    descuento: 0,
    subtotal: 100,
    total: 100,
    items: JSON.stringify([{ cantidad: 1, nombre_producto: 'Latte', precio_unitario: 100 }]),
    ...overrides,
  }
}

const PEDIDOS_MOCK = [pedido(1), pedido(2)]

beforeEach(() => {
  vi.clearAllMocks()
  pedidosApi.getAll.mockResolvedValue({ ok: true, data: PEDIDOS_MOCK })
  usuariosApi.getAll.mockResolvedValue({ ok: true, data: [{ id_usuario: 'U-1', nombre: 'Lupe', apellidos: 'Cajero', activo: true }] })
  useAuth.mockReturnValue({ user: { id_usuario: 'U-9', nombre: 'Fany' }, isAdmin: true })
})

describe('Historial', () => {
  it('muestra filas de carga (skeleton) mientras obtiene el historial', () => {
    render(<Historial />)
    expect(document.querySelectorAll('.skeleton-theme').length).toBeGreaterThan(0)
  })

  it('muestra la tabla de pedidos tras cargar correctamente', async () => {
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    expect(screen.getByText('#PED-2')).toBeInTheDocument()
    expect(screen.getByText('Juan')).toBeInTheDocument()
  })

  it('muestra el error del servidor con el prefijo "Error:" si getAll responde ok:false', async () => {
    pedidosApi.getAll.mockResolvedValue({ ok: false, message: 'Sin permisos' })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('Error: Sin permisos')).toBeInTheDocument())
  })

  it('muestra "Error de conexión:" si getAll lanza una excepción', async () => {
    pedidosApi.getAll.mockRejectedValue(new Error('network down'))
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('Error de conexión: network down')).toBeInTheDocument())
  })

  it('muestra "Sin pedidos en el rango seleccionado" cuando no hay resultados', async () => {
    pedidosApi.getAll.mockResolvedValue({ ok: true, data: [] })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('Sin pedidos en el rango seleccionado')).toBeInTheDocument())
  })

  it('un admin ve el selector de cajero y carga la lista de cajeros activos', async () => {
    render(<Historial />)
    await waitFor(() => expect(usuariosApi.getAll).toHaveBeenCalled())
    expect(screen.getByText('Todos los cajeros')).toBeInTheDocument()
  })

  it('un cajero NO ve el selector de cajero ni dispara la carga de usuarios', async () => {
    useAuth.mockReturnValue({ user: { id_usuario: 'U-1', nombre: 'Lupe' }, isAdmin: false })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    expect(usuariosApi.getAll).not.toHaveBeenCalled()
    expect(screen.queryByText('Todos los cajeros')).not.toBeInTheDocument()
  })

  it('un cajero siempre filtra sus propios pedidos vía id_cajero', async () => {
    useAuth.mockReturnValue({ user: { id_usuario: 'U-1', nombre: 'Lupe' }, isAdmin: false })
    render(<Historial />)
    await waitFor(() => expect(pedidosApi.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ id_cajero: 'U-1' })
    ))
  })

  it('filtra la tabla localmente por folio, cliente o cajero', async () => {
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar por folio, cliente o cajero...'), { target: { value: 'juan' } })
    expect(screen.queryByText('#PED-2')).not.toBeInTheDocument()
    expect(screen.getByText('#PED-1')).toBeInTheDocument()
  })

  it('pagina los resultados cuando hay más de 10 registros', async () => {
    const muchos = Array.from({ length: 11 }, (_, i) => pedido(i + 1))
    pedidosApi.getAll.mockResolvedValue({ ok: true, data: muchos })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('Siguiente →')).toBeInTheDocument())
    expect(screen.getByText(/Mostrando 1–10 de 11 pedidos/)).toBeInTheDocument()
    expect(screen.getByText('#PED-11')).not.toBeNull() // ordenado desc por id_pedido: PED-11 cae en la página 1
    fireEvent.click(screen.getByText('Siguiente →'))
    await waitFor(() => expect(screen.getByText(/Mostrando 11–11 de 11 pedidos/)).toBeInTheDocument())
  })

  it('ordenar por total invierte el orden al hacer clic de nuevo en el encabezado', async () => {
    pedidosApi.getAll.mockResolvedValue({
      ok: true,
      data: [pedido(1, { total: 50 }), pedido(2, { total: 200 })],
    })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    const filasAntes = screen.getAllByText(/^#PED-/).map(el => el.textContent)
    expect(filasAntes).toEqual(['#PED-2', '#PED-1']) // desc por id_pedido por default

    // Primer clic en "Total": ordena desc por total (200 antes de 50) — mismo
    // resultado visual que el orden por default en este caso.
    fireEvent.click(screen.getByText('Total'))
    await waitFor(() => {
      const filas = screen.getAllByText(/^#PED-/).map(el => el.textContent)
      expect(filas).toEqual(['#PED-2', '#PED-1']) // total desc: 200 antes de 50
    })

    // Segundo clic en "Total": invierte a asc (50 antes de 200).
    fireEvent.click(screen.getByText('Total'))
    await waitFor(() => {
      const filas = screen.getAllByText(/^#PED-/).map(el => el.textContent)
      expect(filas).toEqual(['#PED-1', '#PED-2']) // total asc: 50 antes de 200
    })
  })

  it('abre el modal de detalle con el pedido completo al hacer clic en "Ver"', async () => {
    pedidosApi.getById.mockResolvedValue({ ok: true, data: pedido(1, { subtotal: 100, total: 100 }) })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    // Orden desc por id_pedido por default: la fila de PED-1 es la segunda.
    const fila = screen.getByText('#PED-1').closest('tr')
    fireEvent.click(within(fila).getByText('Ver'))
    await waitFor(() => expect(pedidosApi.getById).toHaveBeenCalledWith('PED-1'))
    await waitFor(() => expect(screen.getByText('#PED-1', { selector: 'span.font-mono' })).toBeInTheDocument())
  })

  it('descargar ticket obtiene el detalle completo y llama a jsPDF.save', async () => {
    pedidosApi.getById.mockResolvedValue({ ok: true, data: pedido(1) })
    render(<Historial />)
    await waitFor(() => expect(screen.getByText('#PED-1')).toBeInTheDocument())
    const fila = screen.getByText('#PED-1').closest('tr')
    fireEvent.click(within(fila).getByTitle('Descargar ticket PDF'))
    await waitFor(() => expect(pedidosApi.getById).toHaveBeenCalledWith('PED-1'))
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith('ticket-PED-1.pdf'))
  })
})

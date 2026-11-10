import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Productos from './Productos'
import { productos as productosApi } from '../api/api'
import { useAuth } from '../context/AuthContext'

vi.mock('../api/api', () => ({
  productos: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggle: vi.fn(),
  },
  // Pasa el nombre tal cual como label — evita acoplar esta suite al mapeo
  // interno de sheets.js, que tiene su propia cobertura si se necesita.
  categoriaBadge: (cat) => ({ cls: 'badge-stub', label: cat }),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const PRODUCTOS_MOCK = [
  { id_producto: 'P-1', nombre: 'Café Americano', descripcion: 'Negro y fuerte', categoria: 'café', costo: 8, precio_venta: 35, cantidad_stock: 50, activo: true },
  { id_producto: 'P-2', nombre: 'Croissant', descripcion: '', categoria: 'pan', costo: 12, precio_venta: 28, cantidad_stock: 10, activo: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  productosApi.getAll.mockResolvedValue({ ok: true, data: PRODUCTOS_MOCK })
  useAuth.mockReturnValue({ isAdmin: true })
})

describe('Productos', () => {
  it('muestra filas de carga (skeleton) mientras obtiene el catálogo', () => {
    render(<Productos />)
    expect(document.querySelectorAll('.skeleton-theme').length).toBeGreaterThan(0)
  })

  it('muestra el catálogo tras cargar correctamente', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    expect(screen.getByText('Croissant')).toBeInTheDocument()
    expect(screen.getByText('2 activos · 2 total')).toBeInTheDocument()
  })

  it('muestra el mensaje de error del servidor si getAll responde ok:false', async () => {
    productosApi.getAll.mockResolvedValue({ ok: false, message: 'Sin permisos' })
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Sin permisos')).toBeInTheDocument())
  })

  it('muestra "Error de conexión" si getAll lanza una excepción', async () => {
    productosApi.getAll.mockRejectedValue(new Error('network down'))
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeInTheDocument())
  })

  it('muestra el mensaje de catálogo vacío cuando no hay productos', async () => {
    productosApi.getAll.mockResolvedValue({ ok: true, data: [] })
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Aún no hay productos en el catálogo')).toBeInTheDocument())
  })

  it('un admin ve el botón "Nuevo producto" y las columnas de administración', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    expect(screen.getByText('Nuevo producto')).toBeInTheDocument()
    expect(screen.getAllByText('Editar')).toHaveLength(2)
  })

  it('un cajero NO ve el botón "Nuevo producto" ni las acciones de administración', async () => {
    useAuth.mockReturnValue({ isAdmin: false })
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    expect(screen.queryByText('Nuevo producto')).not.toBeInTheDocument()
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
  })

  it('filtra el catálogo por texto del buscador', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar producto...'), { target: { value: 'croissant' } })
    expect(screen.queryByText('Café Americano')).not.toBeInTheDocument()
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })

  it('filtra el catálogo por categoría al hacer clic en el chip', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^pan/ }))
    expect(screen.queryByText('Café Americano')).not.toBeInTheDocument()
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })

  it('muestra "Sin productos con ese filtro" cuando ningún producto coincide', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar producto...'), { target: { value: 'zzz-no-existe' } })
    expect(screen.getByText('Sin productos con ese filtro')).toBeInTheDocument()
  })

  it('togglear el estado de un producto llama a productosApi.toggle', async () => {
    productosApi.toggle.mockResolvedValue({ ok: true })
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    const fila = screen.getByText('Café Americano').closest('tr')
    const toggleBtn = fila.querySelectorAll('button')[0]
    fireEvent.click(toggleBtn)
    await waitFor(() => expect(productosApi.toggle).toHaveBeenCalledWith('P-1', false))
  })

  it('abre el modal de nuevo producto y valida que el precio de venta sea mayor a 0', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo producto'))
    fireEvent.change(screen.getByPlaceholderText('Café americano'), { target: { value: 'Capuchino' } })
    fireEvent.click(screen.getByText('Crear producto'))
    expect(screen.getByText('El precio de venta debe ser mayor a 0')).toBeInTheDocument()
    expect(productosApi.create).not.toHaveBeenCalled()
  })

  it('valida que nombre sea requerido antes de enviar', async () => {
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo producto'))
    fireEvent.click(screen.getByText('Crear producto'))
    expect(screen.getByText('Nombre y categoría son requeridos')).toBeInTheDocument()
    expect(productosApi.create).not.toHaveBeenCalled()
  })

  it('crea un producto nuevo exitosamente y recarga el catálogo', async () => {
    productosApi.create.mockResolvedValue({ ok: true })
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo producto'))
    fireEvent.change(screen.getByPlaceholderText('Café americano'), { target: { value: 'Capuchino' } })
    fireEvent.change(screen.getAllByPlaceholderText('0.00')[1], { target: { value: '45' } })
    fireEvent.click(screen.getByText('Crear producto'))

    await waitFor(() => expect(productosApi.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Capuchino', precio_venta: '45',
    })))
    await waitFor(() => expect(screen.queryByText('Crear producto')).not.toBeInTheDocument())
  })

  it('editar un producto existente llama a productosApi.update con su id', async () => {
    productosApi.update.mockResolvedValue({ ok: true })
    render(<Productos />)
    await waitFor(() => expect(screen.getByText('Café Americano')).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Editar')[0])
    fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(productosApi.update).toHaveBeenCalledWith(expect.objectContaining({
      id_producto: 'P-1', nombre: 'Café Americano',
    })))
  })
})

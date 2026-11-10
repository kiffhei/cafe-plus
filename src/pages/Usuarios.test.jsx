import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Usuarios from './Usuarios'
import { usuarios as usuariosApi } from '../api/api'

vi.mock('../api/api', () => ({
  usuarios: {
    getAll:  vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    toggle:  vi.fn(),
  },
}))

const USUARIOS_MOCK = [
  { id_usuario: 'USR-001', nombre: 'Fany', apellidos: 'Tapia', usuario: 'fany', categoria: 'admin', activo: true, fecha_registro: '2026-01-01' },
  { id_usuario: 'USR-002', nombre: 'Lupe', apellidos: 'Cajero', usuario: 'lupe', categoria: 'cajero', activo: true, fecha_registro: '2026-02-01' },
]

beforeEach(() => {
  vi.clearAllMocks()
  usuariosApi.getAll.mockResolvedValue({ ok: true, data: USUARIOS_MOCK })
})

describe('Usuarios', () => {
  it('muestra el spinner mientras carga la lista', () => {
    render(<Usuarios />)
    expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument()
  })

  it('muestra la lista de usuarios tras cargar correctamente', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    expect(screen.getByText('lupe')).toBeInTheDocument()
    expect(screen.getByText('2 usuarios registrados')).toBeInTheDocument()
  })

  it('muestra el mensaje de error del servidor si getAll responde ok:false', async () => {
    usuariosApi.getAll.mockResolvedValue({ ok: false, message: 'No autorizado' })
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('No autorizado')).toBeInTheDocument())
  })

  it('muestra "Error de conexión" si getAll lanza una excepción', async () => {
    usuariosApi.getAll.mockRejectedValue(new Error('network down'))
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeInTheDocument())
  })

  it('muestra "No hay usuarios registrados" cuando la lista está vacía', async () => {
    usuariosApi.getAll.mockResolvedValue({ ok: true, data: [] })
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('No hay usuarios registrados')).toBeInTheDocument())
  })

  it('filtra la lista por nombre/usuario al escribir en el buscador', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o usuario...'), { target: { value: 'lupe' } })
    expect(screen.queryByText('fany')).not.toBeInTheDocument()
    expect(screen.getByText('lupe')).toBeInTheDocument()
  })

  it('muestra el mensaje de "sin resultados" cuando el filtro no coincide con nada', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o usuario...'), { target: { value: 'zzz-no-existe' } })
    expect(screen.getByText('No se encontraron usuarios con ese criterio')).toBeInTheDocument()
  })

  it('abre el modal de nuevo usuario al hacer clic en "Nuevo usuario"', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo usuario'))
    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument()
  })

  it('valida que nombre, apellidos y usuario sean requeridos antes de enviar', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo usuario'))
    fireEvent.click(screen.getByText('Crear usuario'))
    expect(screen.getByText('Nombre, apellidos y usuario son requeridos')).toBeInTheDocument()
    expect(usuariosApi.create).not.toHaveBeenCalled()
  })

  it('valida que la contraseña sea requerida para usuarios nuevos', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo usuario'))
    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Carlos' } })
    fireEvent.change(screen.getByPlaceholderText('García López'), { target: { value: 'Ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('juan.garcia'), { target: { value: 'carlos.ruiz' } })
    fireEvent.click(screen.getByText('Crear usuario'))
    expect(screen.getByText('La contraseña es requerida para usuarios nuevos')).toBeInTheDocument()
    expect(usuariosApi.create).not.toHaveBeenCalled()
  })

  it('crea un usuario nuevo exitosamente y recarga la lista', async () => {
    usuariosApi.create.mockResolvedValue({ ok: true })
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo usuario'))
    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Carlos' } })
    fireEvent.change(screen.getByPlaceholderText('García López'), { target: { value: 'Ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('juan.garcia'), { target: { value: 'carlos.ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secreto123' } })
    fireEvent.click(screen.getByText('Crear usuario'))

    await waitFor(() => expect(usuariosApi.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Carlos', apellidos: 'Ruiz', usuario: 'carlos.ruiz', password: 'secreto123',
    })))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Nuevo usuario' })).not.toBeInTheDocument())
  })

  it('muestra el error del servidor cuando create responde ok:false', async () => {
    usuariosApi.create.mockResolvedValue({ ok: false, message: 'Usuario ya existe' })
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nuevo usuario'))
    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Carlos' } })
    fireEvent.change(screen.getByPlaceholderText('García López'), { target: { value: 'Ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('juan.garcia'), { target: { value: 'carlos.ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secreto123' } })
    fireEvent.click(screen.getByText('Crear usuario'))
    await waitFor(() => expect(screen.getByText('Usuario ya existe')).toBeInTheDocument())
  })

  it('al editar un usuario existente, el campo de usuario queda deshabilitado y no exige contraseña', async () => {
    usuariosApi.update.mockResolvedValue({ ok: true })
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Editar')[1]) // lupe (cajero)

    const usuarioInput = screen.getByDisplayValue('lupe')
    expect(usuarioInput).toBeDisabled()

    fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(usuariosApi.update).toHaveBeenCalledWith(expect.objectContaining({
      id_usuario: 'USR-002', usuario: 'lupe',
    })))
  })

  it('el botón de activar/desactivar está deshabilitado para el admin principal (USR-001)', async () => {
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    const toggles = screen.getAllByRole('button').filter(b => b.title === 'El admin principal no puede desactivarse')
    expect(toggles).toHaveLength(1)
    expect(toggles[0]).toBeDisabled()
  })

  it('togglear el estado de un usuario que no es el admin principal llama a usuariosApi.toggle', async () => {
    usuariosApi.toggle.mockResolvedValue({ ok: true })
    render(<Usuarios />)
    await waitFor(() => expect(screen.getByText('fany')).toBeInTheDocument())
    const filaLupe = screen.getByText('lupe').closest('tr')
    const toggleBtn = filaLupe.querySelectorAll('button')[0]
    fireEvent.click(toggleBtn)
    await waitFor(() => expect(usuariosApi.toggle).toHaveBeenCalledWith('USR-002', false))
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AISidebar from './AISidebar'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// VITE_N8N_WEBHOOK está configurado en el .env local de este proyecto (ver
// CLAUDE.md/EasyPanel), así que el módulo arranca con la rama "agente
// configurado" activa. El fallback de "agente no configurado" depende de una
// variable leída a nivel de módulo en import, no es practicable simularlo sin
// reiniciar el módulo — queda fuera de esta suite, documentado en el reporte.
function renderAISidebar(path = '/analisis') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AISidebar />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { nombre: 'Brian' } })
  // jsdom no implementa scrollIntoView — AISidebar lo usa para el auto-scroll
  // del historial de mensajes.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AISidebar', () => {
  it('no se muestra en una ruta sin habilitar (ej. /pedido)', () => {
    renderAISidebar('/pedido')
    expect(screen.queryByTitle('Abrir agente IA')).not.toBeInTheDocument()
  })

  it('muestra el tab flotante en una ruta habilitada (/analisis)', () => {
    renderAISidebar('/analisis')
    expect(screen.getByTitle('Abrir agente IA')).toBeInTheDocument()
  })

  it('también se muestra en /historial', () => {
    renderAISidebar('/historial')
    expect(screen.getByTitle('Abrir agente IA')).toBeInTheDocument()
  })

  it('al hacer clic en el tab flotante abre el panel con el estado vacío', () => {
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    expect(screen.getByText('Usa un chip o escribe tu pregunta')).toBeInTheDocument()
  })

  it('el botón de enviar está deshabilitado cuando el input está vacío', () => {
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    const input = screen.getByPlaceholderText('Escribe tu pregunta...')
    expect(input.value).toBe('')
    const enviarBtn = screen.getByPlaceholderText('Escribe tu pregunta...').parentElement.querySelector('button')
    expect(enviarBtn).toBeDisabled()
  })

  it('al hacer clic en un chip envía el mensaje y muestra la respuesta del agente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ respuesta: 'El producto top fue el Latte.' })),
    }))
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    fireEvent.click(screen.getByText('¿Cuál fue el producto más vendido?'))

    // El texto aparece dos veces: el chip de la pregunta y la burbuja del
    // mensaje de usuario recién agregada.
    expect(screen.getAllByText('¿Cuál fue el producto más vendido?')).toHaveLength(2)
    await waitFor(() => expect(screen.getByText('El producto top fue el Latte.')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('si la respuesta no es JSON válido, usa el mensaje de fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.resolve('texto plano no-json'),
    }))
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    fireEvent.click(screen.getByText('¿Qué día tuvimos más ventas?'))

    await waitFor(() => expect(screen.getByText('No pude obtener una respuesta. Intenta de nuevo.')).toBeInTheDocument())
  })

  it('si el fetch falla, muestra el mensaje de error de conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    fireEvent.click(screen.getByText('¿En qué canal vendemos más?'))

    await waitFor(() => expect(screen.getByText('Error al conectar con el agente IA.')).toBeInTheDocument())
  })

  it('al presionar Enter en el input envía el mensaje escrito', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ respuesta: 'Respuesta de prueba' })),
    }))
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    const input = screen.getByPlaceholderText('Escribe tu pregunta...')
    fireEvent.change(input, { target: { value: '¿Cuánto vendimos hoy?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('¿Cuánto vendimos hoy?')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Respuesta de prueba')).toBeInTheDocument())
  })

  it('al cerrar el panel con el botón de la X, el estado vacío deja de mostrarse', () => {
    renderAISidebar('/analisis')
    fireEvent.click(screen.getByTitle('Abrir agente IA'))
    expect(screen.getByText('Usa un chip o escribe tu pregunta')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Cerrar agente IA'))
    expect(screen.queryByText('Usa un chip o escribe tu pregunta')).not.toBeInTheDocument()
  })
})

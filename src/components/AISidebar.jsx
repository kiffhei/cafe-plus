import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK

const PREGUNTAS = [
  '¿Cuál fue el producto más vendido?',
  '¿En qué canal vendemos más?',
  '¿Cuál es el ticket promedio?',
  '¿Qué día tuvimos más ventas?',
  '¿Cuánto vendimos este mes?',
  '¿Qué cliente compra más seguido?',
]

// AISidebar visible solo en estas rutas
const RUTAS_HABILITADAS = ['/analisis', '/historial']

export default function AISidebar() {
  const location = useLocation()
  const { user }  = useAuth()

  const [open, setOpen]         = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const bottomRef               = useRef(null)

  const habilitado = RUTAS_HABILITADAS.includes(location.pathname)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, enviando])

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (!habilitado) return null

  async function enviarMensaje(texto) {
    const msg = (texto ?? input).trim()
    if (!msg || enviando) return

    setMensajes(m => [...m, { role: 'user', texto: msg, ts: Date.now() }])
    setInput('')
    setEnviando(true)

    if (!N8N_WEBHOOK) {
      setMensajes(m => [...m, {
        role: 'agent',
        texto: 'El agente IA no está configurado. Agrega VITE_N8N_WEBHOOK en EasyPanel.',
        ts: Date.now(),
      }])
      setEnviando(false)
      return
    }

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        body: JSON.stringify({
          mensaje:  msg,
          usuario:  user?.nombre,
          contexto: location.pathname === '/historial' ? 'historial_pedidos' : 'analisis_ventas',
        }),
      })
      const raw = await res.text()
      let data = null
      try { data = JSON.parse(raw) } catch {}
      const respuesta = data?.respuesta ?? data?.output ?? data?.text
        ?? 'No pude obtener una respuesta. Intenta de nuevo.'
      setMensajes(m => [...m, { role: 'agent', texto: respuesta, ts: Date.now() }])
    } catch {
      setMensajes(m => [...m, {
        role: 'agent',
        texto: 'Error al conectar con el agente IA.',
        ts: Date.now(),
      }])
    } finally {
      setEnviando(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje() }
  }

  return (
    <>
      {/* Overlay blur en mobile cuando está abierto */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel principal */}
      <div
        className={`
          fixed top-0 right-0 h-full z-50
          flex flex-col
          transition-all duration-300 ease-in-out
          ${open ? 'w-[340px] sm:w-[380px]' : 'w-0'}
        `}
        style={{
          background: 'var(--cafe-sb-bg)',
          backdropFilter: 'blur(24px)',
          borderLeft: open ? '1px solid var(--cafe-border)' : 'none',
        }}
      >
        {/* Contenido — visible solo cuando está abierto */}
        {open && (
          <div className="flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 shrink-0"
                 style={{ borderBottom: '1px solid var(--cafe-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                   style={{ background: 'var(--cafe-btn)' }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90 leading-tight">Agente IA</p>
                <p className="text-xs text-white/40 truncate">
                  {location.pathname === '/historial' ? 'Historial de pedidos' : 'Análisis de ventas'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Chips rápidos */}
            <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {PREGUNTAS.map((q, i) => (
                <button key={i} onClick={() => enviarMensaje(q)} disabled={enviando}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--cafe-accent)',
                    border: '1px solid var(--cafe-border)',
                  }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
              {mensajes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-40"
                       style={{ background: 'var(--cafe-btn)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                    </svg>
                  </div>
                  <p className="text-white/30 text-xs">Usa un chip o escribe tu pregunta</p>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${m.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'text-white/80 rounded-bl-sm whitespace-pre-line'}`}
                    style={m.role === 'user'
                      ? { background: 'var(--cafe-btn)' }
                      : { background: 'rgba(255,255,255,0.08)', border: '1px solid var(--cafe-border)' }
                    }
                  >
                    {m.texto}
                  </div>
                </div>
              ))}

              {/* Indicador escribiendo */}
              {enviando && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
                       style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--cafe-border)' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: 'var(--cafe-accent)', animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-4 pt-2 shrink-0"
                 style={{ borderTop: '1px solid var(--cafe-border)' }}>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Escribe tu pregunta..."
                  disabled={enviando}
                  className="flex-1 text-sm rounded-xl px-3 py-2.5 bg-white/10 text-white/90
                             placeholder-white/30 border focus:outline-none focus:ring-1 disabled:opacity-50"
                  style={{ borderColor: 'var(--cafe-border)', focusRingColor: 'var(--cafe-accent)' }}
                />
                <button
                  onClick={() => enviarMensaje()}
                  disabled={!input.trim() || enviando}
                  className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0
                             disabled:opacity-40 transition-all hover:brightness-110"
                  style={{ background: 'var(--cafe-btn)' }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab flotante — siempre visible en las rutas habilitadas */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          fixed z-50 top-1/2 -translate-y-1/2
          flex flex-col items-center justify-center gap-1.5
          transition-all duration-300
          ${open ? 'right-[340px] sm:right-[380px]' : 'right-0'}
        `}
        style={{
          background: 'var(--cafe-btn)',
          width: '32px',
          padding: '14px 0',
          borderRadius: '8px 0 0 8px',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        }}
        title={open ? 'Cerrar agente IA' : 'Abrir agente IA'}
      >
        {/* Ícono IA */}
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
        {/* Texto vertical */}
        <span className="text-white/80 font-semibold leading-none"
              style={{ fontSize: '9px', writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.08em' }}>
          {open ? 'CERRAR' : 'IA'}
        </span>
        {/* Indicador de mensajes no leídos */}
        {!open && mensajes.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse" />
        )}
      </button>
    </>
  )
}

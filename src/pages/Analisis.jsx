import { useState, useEffect, useRef, useCallback } from 'react'
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { analytics, formatMXN, formatFecha, canalBadge } from '../api/api'
import { useAuth } from '../context/AuthContext'

const CHART_COLORS = ['#8B4513', '#C1440E', '#6B7C3D', '#d4a96a', '#3b82f6']

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK

// ── Helpers de fecha ─────────────────────────────────────────────

function fechaMX(offsetDias = 0) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + offsetDias * 86400000))
    .split('/').reverse().join('-')
}

const PERIODOS = {
  semana: { label: 'Esta semana', desde: fechaMX(-6), hasta: fechaMX() },
  mes:    { label: 'Este mes',    desde: fechaMX(-29), hasta: fechaMX() },
}

// ── Tooltip personalizado ────────────────────────────────────────

function TooltipCafe({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600
                    rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="font-semibold text-cafe-700 dark:text-crema-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.name === 'Pedidos'
            ? p.value
            : formatMXN(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = 'text-cafe-800 dark:text-crema-100' }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-medium text-cafe-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-bold leading-tight truncate ${color}`}>{value}</p>
      {sub && <p className="text-xs text-cafe-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Chips de preguntas rápidas ───────────────────────────────────

const PREGUNTAS_RAPIDAS = [
  '¿Cuál fue el producto más vendido?',
  '¿En qué canal vendemos más?',
  '¿Cuál es el ticket promedio?',
  '¿Qué día tuvimos más ventas?',
]

// ── Componente principal ─────────────────────────────────────────

export default function Analisis() {
  const { user } = useAuth()

  // Periodo
  const [periodo, setPeriodo]       = useState('semana')
  const [fechaDesde, setFechaDesde] = useState(PERIODOS.semana.desde)
  const [fechaHasta, setFechaHasta] = useState(PERIODOS.semana.hasta)

  // Datos
  const [kpis, setKpis]           = useState(null)
  const [ventasDia, setVentasDia] = useState([])
  const [porCanal, setPorCanal]   = useState([])
  const [tendencia, setTendencia] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // Chat IA
  const [mensajes, setMensajes]   = useState([])
  const [inputChat, setInputChat] = useState('')
  const [enviando, setEnviando]   = useState(false)
  const chatBottomRef             = useRef(null)

  // ── Carga de datos ─────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await analytics.getPeriodo(fechaDesde, fechaHasta)
      if (!res.ok) { setError(`Error: ${res.message || 'sin datos'}`); return }

      const data = res.data

      setKpis({
        totalVentas:    data.total_ventas    ?? 0,
        ticketPromedio: data.ticket_promedio ?? 0,
        totalPedidos:   data.total_pedidos   ?? 0,
        canalTop:       data.canal_top       ?? '—',
        productoTop:    data.producto_top    ?? '—',
      })

      setVentasDia(
        (data.ventas_por_dia ?? []).map(d => ({
          dia:     formatFecha(d.fecha),
          Ventas:  parseFloat(d.total   ?? 0),
          Pedidos: parseInt(d.pedidos   ?? 0, 10),
        }))
      )

      setPorCanal(
        (data.por_canal ?? []).map(c => ({
          name:  canalBadge(c.canal).label,
          value: parseInt(c.pedidos ?? 0, 10),
        }))
      )

      // Tendencia acumulada
      setTendencia(
        (data.ventas_por_dia ?? []).reduce((acc, d) => {
          const prev = acc.length ? acc[acc.length - 1].Acumulado : 0
          return [...acc, {
            dia:       formatFecha(d.fecha),
            Acumulado: prev + parseFloat(d.total ?? 0),
          }]
        }, [])
      )
    } catch (err) {
      setError(`Error de conexión: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, enviando])

  // ── Cambio de periodo ──────────────────────────────────────────

  function seleccionarPeriodo(p) {
    setPeriodo(p)
    if (p !== 'custom') {
      setFechaDesde(PERIODOS[p].desde)
      setFechaHasta(PERIODOS[p].hasta)
    }
  }

  // ── Chat IA ────────────────────────────────────────────────────

  async function enviarMensaje(texto) {
    const msg = (texto ?? inputChat).trim()
    if (!msg || enviando) return

    setMensajes(m => [...m, { role: 'user', texto: msg, ts: Date.now() }])
    setInputChat('')
    setEnviando(true)

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        body: JSON.stringify({
          mensaje:  msg,
          periodo:  { desde: fechaDesde, hasta: fechaHasta },
          usuario:  user?.nombre,
          contexto: 'analisis_ventas',
        }),
      })
      const data = await res.json()
      const respuesta = data?.respuesta ?? data?.output ?? data?.text
        ?? 'No pude obtener una respuesta. Intenta de nuevo.'
      setMensajes(m => [...m, { role: 'agent', texto: respuesta, ts: Date.now() }])
    } catch (err) {
      setMensajes(m => [...m, {
        role:  'agent',
        texto: `Error al conectar con el agente: ${err?.message ?? 'sin respuesta'}`,
        ts:    Date.now(),
      }])
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje() }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Selector de periodo */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(PERIODOS).map(([key, { label }]) => (
          <button key={key} onClick={() => seleccionarPeriodo(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${periodo === key
                ? 'bg-cafe-700 text-crema-100'
                : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
            {label}
          </button>
        ))}
        <button onClick={() => seleccionarPeriodo('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${periodo === 'custom'
              ? 'bg-cafe-700 text-crema-100'
              : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
          Personalizado
        </button>
        {periodo === 'custom' && (
          <>
            <input type="date" value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="input-cafe text-sm" />
            <span className="text-cafe-400 text-sm">—</span>
            <input type="date" value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="input-cafe text-sm" />
            <button onClick={cargar} className="btn-primary text-sm px-4 py-2">
              Aplicar
            </button>
          </>
        )}
        {loading && (
          <span className="w-4 h-4 border-2 border-cafe-400 border-t-cafe-700
                           rounded-full animate-spin" />
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                        rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Sección A: KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon="💰" label="Total ventas"
          value={formatMXN(kpis?.totalVentas ?? 0)}
          sub="solo entregados"
          color="text-terracota-500" />
        <KpiCard icon="🧾" label="Ticket promedio"
          value={formatMXN(kpis?.ticketPromedio ?? 0)}
          sub="por pedido" />
        <KpiCard icon="📦" label="Total pedidos"
          value={kpis?.totalPedidos ?? '—'}
          sub="en el periodo" />
        <KpiCard icon="🏆" label="Canal top"
          value={kpis ? canalBadge(kpis.canalTop).label : '—'}
          sub="más pedidos"
          color="text-olivo-600 dark:text-olivo-400" />
        <KpiCard icon="⭐" label="Producto top"
          value={kpis?.productoTop ?? '—'}
          sub="más vendido" />
      </div>

      {/* ── Sección B: Gráficas ── */}
      {!loading && ventasDia.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Ventas por día — BarChart */}
          <div className="lg:col-span-2 card">
            <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
              Ventas por día
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.4} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip content={(props) => <TooltipCafe {...props} />} />
                <Bar dataKey="Ventas" fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por canal — PieChart */}
          <div className="card flex flex-col">
            <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
              Por canal
            </h3>
            {porCanal.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={porCanal} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value" paddingAngle={3}>
                      {porCanal.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v + ' pedidos', n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {porCanal.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-cafe-600 dark:text-cafe-300">{c.name}</span>
                      </div>
                      <span className="font-semibold text-cafe-700 dark:text-crema-200">
                        {c.value} pedidos
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-cafe-400 text-center py-8">Sin datos de canales</p>
            )}
          </div>
        </div>
      )}

      {/* Tendencia acumulada — LineChart */}
      {!loading && tendencia.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
            Tendencia acumulada del periodo
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tendencia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.4} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip content={(props) => <TooltipCafe {...props} />} />
              <Line type="monotone" dataKey="Acumulado" stroke={CHART_COLORS[1]}
                strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Estado vacío si no hay datos */}
      {!loading && !error && ventasDia.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-cafe-500 dark:text-cafe-400 font-medium">
            Sin datos de ventas en este periodo
          </p>
        </div>
      )}

      {/* ── Sección C: Chat IA ── */}
      <div className="bg-white dark:bg-cafe-800 rounded-xl border border-cafe-100 dark:border-cafe-700 shadow-card overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-cafe-100 dark:border-cafe-700 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-terracota-500 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-cafe-800 dark:text-crema-100">
              Agente IA — Análisis de ventas
            </p>
            <p className="text-xs text-cafe-400">
              Pregunta sobre tus datos del periodo seleccionado
            </p>
          </div>
        </div>

        {/* Chips de pregunta rápida */}
        <div className="px-5 pt-3 pb-1 flex gap-2 flex-wrap">
          {PREGUNTAS_RAPIDAS.map((q, i) => (
            <button key={i} onClick={() => enviarMensaje(q)} disabled={enviando}
              className="px-3 py-1.5 rounded-full text-xs font-medium
                         bg-crema-100 dark:bg-cafe-700 text-cafe-700 dark:text-crema-200
                         border border-crema-200 dark:border-cafe-600
                         hover:bg-crema-200 dark:hover:bg-cafe-600
                         disabled:opacity-50 transition-all">
              {q}
            </button>
          ))}
        </div>

        {/* Historial de mensajes */}
        <div className="px-5 py-3 min-h-[160px] max-h-80 overflow-y-auto space-y-3">
          {mensajes.length === 0 && (
            <p className="text-xs text-cafe-400 text-center py-8">
              Usa un chip o escribe tu pregunta para empezar
            </p>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                ${m.role === 'user'
                  ? 'bg-cafe-700 text-crema-100 rounded-br-sm'
                  : 'bg-crema-100 dark:bg-cafe-700 text-cafe-800 dark:text-crema-100 rounded-bl-sm'}`}>
                {m.texto}
              </div>
            </div>
          ))}
          {/* Indicador "escribiendo..." */}
          {enviando && (
            <div className="flex justify-start">
              <div className="bg-crema-100 dark:bg-cafe-700 px-4 py-3
                              rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span key={i}
                    className="w-1.5 h-1.5 bg-cafe-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 pb-5 pt-2 border-t border-cafe-100 dark:border-cafe-700">
          <div className="flex gap-2">
            <input
              value={inputChat}
              onChange={e => setInputChat(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              disabled={enviando}
              className="input-cafe flex-1 text-sm"
            />
            <button
              onClick={() => enviarMensaje()}
              disabled={!inputChat.trim() || enviando}
              className="btn-primary px-4 shrink-0 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

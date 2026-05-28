import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analytics, agente, formatMXN, formatFecha } from '../api/api'

function hoy() { return new Date().toISOString().split('T')[0] }
function haceDias(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const PERIODOS = [
  { label: 'Hoy',       desde: hoy(),       hasta: hoy() },
  { label: 'Semana',    desde: haceDias(7),  hasta: hoy() },
  { label: 'Mes',       desde: haceDias(30), hasta: hoy() },
  { label: '3 meses',   desde: haceDias(90), hasta: hoy() },
]

const CANAL_COLORES = {
  local:    '#6B7C3D',
  didi:     '#F97316',
  rappi:    '#16A34A',
  ubereats: '#1F2937',
}
const CANAL_LABELS = {
  local: 'Local', didi: 'DiDi Food', rappi: 'Rappi', ubereats: 'Uber Eats',
}

// Tooltip personalizado para gráficas de ventas
function TooltipVentas({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 rounded-xl px-4 py-3 shadow-warm text-sm">
      <p className="text-xs text-cafe-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
          {formatMXN(p.value)}
        </p>
      ))}
    </div>
  )
}

function TooltipPedidos({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 rounded-xl px-4 py-3 shadow-warm text-sm">
      <p className="text-xs text-cafe-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-cafe-700 dark:text-crema-200">
          {p.value} pedidos
        </p>
      ))}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, colorClass }) {
  return (
    <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-cafe-500 dark:text-cafe-400 uppercase tracking-wide">{label}</p>
        <span className={`text-xl ${colorClass}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-cafe-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Panel IA ────────────────────────────────────────────────────────────────
function PanelIA({ contexto }) {
  const [mensaje,    setMensaje]    = useState('')
  const [respuesta,  setRespuesta]  = useState('')
  const [cargando,   setCargando]   = useState(false)
  const [historial,  setHistorial]  = useState([])
  const [error,      setError]      = useState('')

  async function enviar() {
    if (!mensaje.trim()) return
    const q = mensaje.trim()
    setMensaje('')
    setHistorial(h => [...h, { rol: 'usuario', texto: q }])
    setCargando(true); setError('')
    try {
      const res = await agente.chat(q, contexto)
      const texto = res?.respuesta || res?.message || res?.text || JSON.stringify(res)
      setHistorial(h => [...h, { rol: 'asistente', texto }])
    } catch {
      setError('No se pudo conectar con el agente IA. Verifica la configuración de n8n.')
    } finally {
      setCargando(false)
    }
  }

  function manejarTecla(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const sugerencias = [
    '¿Cuál es el producto más vendido?',
    '¿Qué canal genera más ingresos?',
    'Dame recomendaciones para aumentar ventas',
    '¿Qué días de la semana vendo más?',
  ]

  return (
    <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-cafe-100 dark:border-cafe-700 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-cafe-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-crema-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-cafe-800 dark:text-crema-100 text-sm">Asistente IA</h3>
          <p className="text-xs text-cafe-400">Powered by Claude + n8n</p>
        </div>
      </div>

      {/* Historial de chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {historial.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-cafe-400 text-center mb-3">Pregúntale al asistente sobre tus ventas</p>
            {sugerencias.map(s => (
              <button key={s} onClick={() => { setMensaje(s) }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-crema-50 dark:bg-cafe-700 border border-cafe-100 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-100 dark:hover:bg-cafe-600 transition-all">
                {s}
              </button>
            ))}
          </div>
        ) : (
          historial.map((m, i) => (
            <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                m.rol === 'usuario'
                  ? 'bg-cafe-600 text-crema-100 rounded-br-sm'
                  : 'bg-crema-100 dark:bg-cafe-700 text-cafe-800 dark:text-crema-100 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.texto}</p>
              </div>
            </div>
          ))
        )}
        {cargando && (
          <div className="flex justify-start">
            <div className="bg-crema-100 dark:bg-cafe-700 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cafe-400 animate-bounce" style={{ animationDelay: '0ms' }}/>
                <span className="w-1.5 h-1.5 rounded-full bg-cafe-400 animate-bounce" style={{ animationDelay: '150ms' }}/>
                <span className="w-1.5 h-1.5 rounded-full bg-cafe-400 animate-bounce" style={{ animationDelay: '300ms' }}/>
              </div>
            </div>
          </div>
        )}
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-cafe-100 dark:border-cafe-700">
        <div className="flex gap-2">
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            onKeyDown={manejarTecla}
            placeholder="Escribe tu pregunta... (Enter para enviar)"
            className="input-cafe flex-1 resize-none text-sm"
            rows={2}
          />
          <button onClick={enviar} disabled={cargando || !mensaje.trim()}
            className="btn-primary px-3 self-end disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Analisis() {
  const [periodo,  setPeriodo]  = useState(PERIODOS[2]) // Mes por defecto
  const [custom,   setCustom]   = useState({ desde: haceDias(30), hasta: hoy() })
  const [usandoCustom, setUsandoCustom] = useState(false)
  const [datos,    setDatos]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const desde = usandoCustom ? custom.desde : periodo.desde
  const hasta  = usandoCustom ? custom.hasta  : periodo.hasta

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await analytics.getPeriodo(desde, hasta)
      if (res.ok) setDatos(res.data)
      else setError('No se pudieron cargar los datos')
    } catch {
      setError('Error de conexión')
    }
    setLoading(false)
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  // Preparar series de gráficas desde datos reales
  const ventasPorDia = datos?.ventas_por_dia?.map(d => ({
    fecha: formatFecha(d.fecha),
    ventas: parseFloat(d.total || 0),
    pedidos: parseInt(d.pedidos || 0),
  })) || []

  const porCanal = datos?.por_canal?.map(c => ({
    name:   CANAL_LABELS[c.canal] || c.canal,
    canal:  c.canal,
    value:  parseFloat(c.total || 0),
    pedidos: parseInt(c.pedidos || 0),
  })) || []

  const topProductos = (datos?.top_productos || []).slice(0, 8).map(p => ({
    name:     p.nombre,
    vendidos: parseInt(p.cantidad || 0),
    ingresos: parseFloat(p.total || 0),
  }))

  // KPIs
  const totalVentas     = datos?.resumen?.total_ventas     || 0
  const totalPedidos    = datos?.resumen?.total_pedidos    || 0
  const ticketPromedio  = datos?.resumen?.ticket_promedio  || 0
  const clientesUnicos  = datos?.resumen?.clientes_unicos  || 0

  const contextoIA = datos ? JSON.stringify({
    periodo: { desde, hasta },
    resumen: datos.resumen,
    top_productos: datos.top_productos?.slice(0, 5),
    por_canal: datos.por_canal,
  }) : ''

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header + período */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-cafe-800 dark:text-crema-100">Análisis</h1>
          <p className="text-sm text-cafe-500 dark:text-cafe-400 mt-0.5">
            {formatFecha(desde)} — {formatFecha(hasta)}
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODOS.map(p => (
            <button key={p.label}
              onClick={() => { setPeriodo(p); setUsandoCustom(false) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${!usandoCustom && periodo.label === p.label
                  ? 'bg-cafe-700 text-crema-100'
                  : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
              {p.label}
            </button>
          ))}
          {/* Custom */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={custom.desde}
              onChange={e => { setCustom(c => ({ ...c, desde: e.target.value })); setUsandoCustom(true) }}
              className="input-cafe text-xs py-1.5 w-36" />
            <span className="text-cafe-400 text-xs">—</span>
            <input type="date" value={custom.hasta}
              onChange={e => { setCustom(c => ({ ...c, hasta: e.target.value })); setUsandoCustom(true) }}
              className="input-cafe text-xs py-1.5 w-36" />
          </div>
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700 transition-all disabled:opacity-50">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas totales"
          value={loading ? '—' : formatMXN(totalVentas)}
          sub={loading ? '' : `${totalPedidos} pedidos en el período`}
          icon="&#x1F4B0;"
          colorClass="text-terracota-500"
        />
        <KpiCard
          label="Pedidos"
          value={loading ? '—' : totalPedidos}
          sub={loading ? '' : `${formatMXN(ticketPromedio)} ticket promedio`}
          icon="&#x1F4CB;"
          colorClass="text-cafe-600 dark:text-cafe-300"
        />
        <KpiCard
          label="Ticket promedio"
          value={loading ? '—' : formatMXN(ticketPromedio)}
          sub="por pedido entregado"
          icon="&#x1F9FE;"
          colorClass="text-olivo-600 dark:text-olivo-400"
        />
        <KpiCard
          label="Clientes únicos"
          value={loading ? '—' : clientesUnicos}
          sub="con cuenta Plus"
          icon="&#x1F465;"
          colorClass="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ventas por día — ocupa 2 columnas */}
        <div className="lg:col-span-2 bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm p-5">
          <h3 className="font-semibold text-cafe-800 dark:text-crema-100 text-sm mb-4">Ventas por día</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin"/>
            </div>
          ) : ventasPorDia.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-cafe-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ventasPorDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.4}/>
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#c08040' }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#c08040' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<TooltipVentas />}/>
                <Bar dataKey="ventas" fill="#8B4513" radius={[4, 4, 0, 0]} maxBarSize={40}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribución por canal */}
        <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm p-5">
          <h3 className="font-semibold text-cafe-800 dark:text-crema-100 text-sm mb-4">Por canal</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin"/>
            </div>
          ) : porCanal.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-cafe-400 text-sm">Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={porCanal} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={65} innerRadius={35} paddingAngle={3}>
                    {porCanal.map((entry, i) => (
                      <Cell key={i} fill={CANAL_COLORES[entry.canal] || '#8B4513'}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatMXN(val)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {porCanal.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CANAL_COLORES[c.canal] || '#8B4513' }}/>
                      <span className="text-cafe-600 dark:text-cafe-300">{c.name}</span>
                    </div>
                    <span className="font-semibold text-cafe-700 dark:text-crema-200">{formatMXN(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top productos + Panel IA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top productos */}
        <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm p-5">
          <h3 className="font-semibold text-cafe-800 dark:text-crema-100 text-sm mb-4">Top productos</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin"/>
            </div>
          ) : topProductos.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-cafe-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProductos} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.3} horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#c08040' }} tickLine={false} axisLine={false}/>
                <YAxis type="category" dataKey="name" width={110}
                  tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false} axisLine={false}/>
                <Tooltip formatter={(val) => [`${val} uds.`, 'Vendidos']}/>
                <Bar dataKey="vendidos" fill="#C1440E" radius={[0, 4, 4, 0]} maxBarSize={22}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pedidos por día (línea) + Panel IA */}
        <div className="space-y-4">
          {/* Tendencia pedidos */}
          <div className="bg-white dark:bg-cafe-800 rounded-2xl border border-cafe-100 dark:border-cafe-700 shadow-sm p-5">
            <h3 className="font-semibold text-cafe-800 dark:text-crema-100 text-sm mb-4">Tendencia de pedidos</h3>
            {loading ? (
              <div className="h-28 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin"/>
              </div>
            ) : ventasPorDia.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-cafe-400 text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={ventasPorDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.3}/>
                  <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#c08040' }} tickLine={false} axisLine={false}/>
                  <YAxis tick={{ fontSize: 9, fill: '#c08040' }} tickLine={false} axisLine={false} allowDecimals={false}/>
                  <Tooltip content={<TooltipPedidos />}/>
                  <Line type="monotone" dataKey="pedidos" stroke="#6B7C3D" strokeWidth={2}
                    dot={{ fill: '#6B7C3D', r: 3 }} activeDot={{ r: 5 }}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Panel IA */}
          <div style={{ height: '340px' }}>
            <PanelIA contexto={contextoIA} />
          </div>
        </div>
      </div>
    </div>
  )
}

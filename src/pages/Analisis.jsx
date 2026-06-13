import { useState, useEffect, useRef, useCallback } from 'react'

const DEBUG_IA = import.meta.env.VITE_DEBUG_IA === 'true'
import {
  BarChart, Bar,
  LineChart, Line,
  Treemap,
  Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { pedidos as pedidosApi, formatMXN, formatFecha, canalBadge, generarMeses } from '../api/api'
// getAllDetalle incluye campo items para calcular producto top
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const CHART_COLORS = ['#2d6a4f', '#1e6091', '#40916c', '#48cae4', '#84cba8']

const TEMA_CHART_PRIMARY = {
  'matcha':      '#52b788',
  'cafe-oscuro': '#d4a96a',
  'medianoche':  '#a78bfa',
  'terracota':   '#f4a460',
  'pizarra':     '#a3e635',
}
const TEMA_CHART_BTN = {
  'matcha':      '#2d6a4f',
  'cafe-oscuro': '#7a5230',
  'medianoche':  '#5248c0',
  'terracota':   '#b05520',
  'pizarra':     '#3d5068',
}

const CANAL_COLORS = {
  'Local':     '#2d6a4f',
  'Rappi':     '#1e6091',
  'Uber Eats': '#40916c',
  'DiDi Food': '#48cae4',
}
function canalColor(name) {
  return CANAL_COLORS[name] ?? '#84cba8'
}

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK

// Estilo compartido para todos los tooltips de recharts — paleta Fresh Matcha
const TOOLTIP_STYLE = {
  backgroundColor: '#0d2d1f',
  border: '1px solid #1a4a34',
  borderRadius: '8px',
  color: '#e8f5f0',
  fontSize: '12px',
}
const TOOLTIP_ITEM_STYLE  = { color: '#e8f5f0' }
const TOOLTIP_LABEL_STYLE = { color: '#84cba8', fontWeight: '600' }

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

// ── KPI card ─────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = 'text-cafe-800 dark:text-crema-100' }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-cafe-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
        <p className="text-xs font-medium text-cafe-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-bold leading-tight truncate ${color}`}>{value}</p>
      {sub && <p className="text-xs text-cafe-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Helpers de cálculo frontend ─────────────────────────────────

function agruparPorFecha(pedidos) {
  return pedidos.reduce((acc, p) => {
    // fecha_hora puede ser "2024-01-15 10:30:00" o "2024-01-15T10:30:00"
    const fecha = p.fecha_hora
      ? String(p.fecha_hora).substring(0, 10)
      : null
    if (!fecha) return acc
    const prev = acc[fecha] || { total: 0, count: 0 }
    return { ...acc, [fecha]: { total: prev.total + parseFloat(p.total || 0), count: prev.count + 1 } }
  }, {})
}

function calcularTop(pedidos, campo) {
  const mapa = {}
  pedidos.forEach(p => {
    const val = p[campo]
    if (val) mapa[val] = (mapa[val] || 0) + 1
  })
  return Object.entries(mapa).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
}

function parseItems(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

function calcularProductoTop(pedidos) {
  // Log de diagnóstico — ver estructura real del campo items
  if (pedidos.length > 0) {
    console.log('[Analisis] items sample:', pedidos[0]?.items, '| type:', typeof pedidos[0]?.items)
  }
  const mapa = {}
  pedidos.forEach(p => {
    const items = parseItems(p.items)
    items.forEach(it => {
      // Soportar nombre_producto o nombre (distintas keys según versión GAS)
      const nombre = it.nombre_producto ?? it.nombre ?? it.product_name
      if (nombre) mapa[nombre] = (mapa[nombre] || 0) + (Number(it.cantidad) || 1)
    })
  })
  if (Object.keys(mapa).length === 0) return null
  return Object.entries(mapa).sort(([, a], [, b]) => b - a)[0][0]
}

function calcularHoraPico(pedidos) {
  const conteo = Array(24).fill(0)
  pedidos.forEach(p => {
    if (!p.fecha_hora) return
    const d = new Date(p.fecha_hora)
    if (!isNaN(d.getTime())) {
      conteo[d.getHours()]++
    }
  })
  const maxVal = Math.max(...conteo)
  return conteo.map((count, hora) => ({
    hora: `${String(hora).padStart(2, '0')}:00`,
    pedidos: count,
    esPico: count === maxVal && maxVal > 0,
  }))
}

// ── Chips de preguntas rápidas ───────────────────────────────────

const MESES = generarMeses()

const PREGUNTAS_RAPIDAS = [
  '¿Cuál fue el producto más vendido?',
  '¿En qué canal vendemos más?',
  '¿Cuál es el ticket promedio?',
  '¿Qué día tuvimos más ventas?',
]

// ── Componente principal ─────────────────────────────────────────

export default function Analisis() {
  const { user } = useAuth()
  const { tema } = useTheme()
  const chartAccent = TEMA_CHART_PRIMARY[tema] || '#52b788'
  const chartBtn    = TEMA_CHART_BTN[tema]    || '#2d6a4f'

  // Periodo
  const [periodo, setPeriodo]       = useState('semana')
  const [fechaDesde, setFechaDesde] = useState(PERIODOS.semana.desde)
  const [fechaHasta, setFechaHasta] = useState(PERIODOS.semana.hasta)
  const [mesSel, setMesSel]         = useState('')

  // Datos
  const [kpis, setKpis]           = useState(null)
  const [ventasDia, setVentasDia] = useState([])
  const [porCanal, setPorCanal]   = useState([])
  const [tendencia, setTendencia] = useState([])
  const [pedidos, setPedidos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // Chat IA
  const [mensajes, setMensajes]   = useState([])
  const [inputChat, setInputChat] = useState('')
  const [enviando, setEnviando]   = useState(false)
  const chatBottomRef             = useRef(null)

  // ── Carga de datos — usa getPedidos y calcula KPIs en frontend ──

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await pedidosApi.getAllDetalle({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
      if (!res.ok) { setError(`Error: ${res.message || 'sin datos'}`); return }

      const todos = Array.isArray(res.data) ? res.data : []
      setPedidos(todos)
      const entregados = todos.filter(p => p.estado === 'entregado')

      // ── KPIs ──
      const totalVentas = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)
      setKpis({
        totalVentas,
        ticketPromedio: entregados.length ? totalVentas / entregados.length : 0,
        totalPedidos:   todos.length,
        canalTop:       calcularTop(todos, 'canal')       || '—',
        productoTop:    calcularProductoTop(todos)        || '—',
      })

      // ── Ventas por día ──
      const porDia = agruparPorFecha(entregados)
      setVentasDia(
        Object.entries(porDia)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([fecha, { total, count }]) => ({
            dia:     formatFecha(fecha),
            Ventas:  total,
            Pedidos: count,
          }))
      )

      // ── Por canal ──
      const canalMap = {}
      todos.forEach(p => {
        const k = p.canal || 'local'
        canalMap[k] = (canalMap[k] || 0) + 1
      })
      setPorCanal(
        Object.entries(canalMap).map(([canal, count]) => ({
          name:  canalBadge(canal).label,
          value: count,
        }))
      )

      // ── Tendencia acumulada ──
      setTendencia(
        Object.entries(porDia)
          .sort(([a], [b]) => a.localeCompare(b))
          .reduce((acc, [fecha, { total }]) => {
            const prev = acc.length ? acc[acc.length - 1].Acumulado : 0
            return [...acc, { dia: formatFecha(fecha), Acumulado: prev + total }]
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
    setMesSel('')
    if (p !== 'custom') {
      setFechaDesde(PERIODOS[p].desde)
      setFechaHasta(PERIODOS[p].hasta)
    }
  }

  function seleccionarMes(desde) {
    if (!desde) {
      setMesSel('')
      setPeriodo('custom')
      setFechaDesde('')
      setFechaHasta('')
      return
    }
    const mes = MESES.find(m => m.desde === desde)
    if (!mes) return
    setMesSel(desde)
    setPeriodo('custom')
    setFechaDesde(mes.desde)
    setFechaHasta(mes.hasta)
  }

  // ── Chat IA ────────────────────────────────────────────────────

  async function enviarMensaje(texto) {
    const msg = (texto ?? inputChat).trim()
    if (!msg || enviando) return

    setMensajes(m => [...m, { role: 'user', texto: msg, ts: Date.now() }])
    setInputChat('')
    setEnviando(true)

    if (!N8N_WEBHOOK) {
      setMensajes(m => [...m, {
        role:  'agent',
        texto: 'El agente IA no está configurado aún. Agrega VITE_N8N_WEBHOOK en las variables de entorno de EasyPanel.',
        ts:    Date.now(),
      }])
      setEnviando(false)
      return
    }

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
      if (DEBUG_IA) console.log('[IA] status:', res.status)
      if (DEBUG_IA) console.log('[IA] content-type:', res.headers.get('content-type'))
      const raw = await res.text()
      if (DEBUG_IA) console.log('[IA] raw response:', raw)
      let data = null
      try { data = JSON.parse(raw) } catch(e) { if (DEBUG_IA) console.error('[IA] parse error:', e) }
      if (DEBUG_IA) console.log('[IA] parsed data:', data)
      const respuesta = data?.respuesta ?? data?.output ?? data?.text
        ?? 'No pude obtener una respuesta. Intenta de nuevo.'
      setMensajes(m => [...m, { role: 'agent', texto: respuesta, ts: Date.now() }])
    } catch (err) {
      setMensajes(m => [...m, {
        role:  'agent',
        texto: 'Error al conectar con el agente IA. Verifica que el webhook de n8n esté activo.',
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
        <select
          value={mesSel}
          onChange={e => seleccionarMes(e.target.value)}
          className="input-cafe text-sm"
          style={{ minWidth: '180px' }}
        >
          <option value="">Todos los registros</option>
          {MESES.map(m => (
            <option key={m.desde} value={m.desde}>{m.label}</option>
          ))}
        </select>
        {Object.entries(PERIODOS).map(([key, { label }]) => (
          <button key={key} onClick={() => seleccionarPeriodo(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${periodo === key
                ? 'tab-active-theme'
                : 'bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-50 dark:hover:bg-cafe-700'}`}>
            {label}
          </button>
        ))}
        <button onClick={() => seleccionarPeriodo('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${periodo === 'custom'
              ? 'tab-active-theme'
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
        <KpiCard icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Total ventas"
          value={formatMXN(kpis?.totalVentas ?? 0)}
          sub="solo entregados"
          color="text-accent-theme" />
        <KpiCard icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" label="Ticket promedio"
          value={formatMXN(kpis?.ticketPromedio ?? 0)}
          sub="por pedido" />
        <KpiCard icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" label="Total pedidos"
          value={kpis?.totalPedidos ?? '—'}
          sub="en el periodo" />
        <KpiCard icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" label="Canal top"
          value={kpis ? canalBadge(kpis.canalTop).label : '—'}
          sub="más pedidos"
          color="text-olivo-600 dark:text-olivo-400" />
        <KpiCard icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" label="Producto top"
          value={kpis?.productoTop ?? '—'}
          sub="más vendido" />
      </div>

      {/* ── Sección B: Gráficas — COMENTADAS para diagnóstico ── */}
      {/* GRAFICA_1_BAR */}
      {!loading && ventasDia.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card">
            <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">Ventas por día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.4} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip
                  formatter={(value) => [formatMXN(value), 'Ventas']}
                  labelFormatter={(label) => `Día: ${label}`}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Bar dataKey="Ventas" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {ventasDia.map((entry, i) => {
                    const max = Math.max(...ventasDia.map(d => d.Ventas))
                    return (
                      <Cell key={i} fill={
                        entry.Ventas > max * 0.66 ? chartBtn :
                        entry.Ventas > max * 0.33 ? chartAccent : '#84cba8'
                      } />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* GRAFICA_2_TREEMAP */}
      {!loading && porCanal.length > 0 && (
        <div className="card flex flex-col">
          <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">Por canal</h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[240px]">
            <Treemap
              data={porCanal.map(d => ({ ...d, fill: canalColor(d.name) }))}
              dataKey="value"
              aspectRatio={4 / 3}
              content={(props) => {
                const { x, y, width, height, name, value, fill } = props
                const total = porCanal.reduce((s, d) => s + d.value, 0)
                const pct = total > 0 ? Math.round((value / total) * 100) : 0
                const showText = width > 48 && height > 32
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height}
                      fill={fill} rx={4} ry={4} stroke="#0d1b2a" strokeWidth={2} />
                    {showText && (
                      <>
                        <text x={x + width / 2} y={y + height / 2 - 6}
                          textAnchor="middle" dominantBaseline="middle"
                          fill="#ffffff" fontSize={11} fontWeight={600}
                          style={{ pointerEvents: 'none' }}>
                          {name}
                        </text>
                        <text x={x + width / 2} y={y + height / 2 + 9}
                          textAnchor="middle" dominantBaseline="middle"
                          fill="rgba(255,255,255,0.8)" fontSize={10}
                          style={{ pointerEvents: 'none' }}>
                          {pct}%
                        </text>
                      </>
                    )}
                  </g>
                )
              }}
            >
              <Tooltip
                formatter={(value, name) => {
                  const total = porCanal.reduce((s, d) => s + d.value, 0)
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0
                  return [`${value} pedidos (${pct}%)`, name]
                }}
                contentStyle={{ backgroundColor: '#0d2d1f', border: '1px solid #1a4a34', borderRadius: '8px', color: '#e8f5f0', fontSize: '12px' }}
                itemStyle={{ color: '#e8f5f0' }}
                labelStyle={{ color: '#84cba8', fontWeight: '600' }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}

      {/* GRAFICA_3_LINE */}
      {!loading && tendencia.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">Tendencia acumulada</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tendencia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" strokeOpacity={0.4} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7a5c4a' }} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip
                formatter={(value) => [formatMXN(value), 'Acumulado']}
                labelFormatter={(label) => `Día: ${label}`}
                contentStyle={TOOLTIP_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
              />
              <Line type="monotone" dataKey="Acumulado" stroke={chartBtn}
                strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Estado vacío si no hay datos */}
      {!loading && !error && ventasDia.length === 0 && (
        <div className="card text-center py-12">
          <svg className="w-10 h-10 mx-auto mb-3 text-cafe-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p className="text-cafe-500 dark:text-cafe-400 font-medium">
            Sin datos de ventas en este periodo
          </p>
        </div>
      )}

      {/* ── Sección D: Hora pico ── */}
      {!loading && pedidos.length > 0 && (
        <div className="bg-white dark:bg-cafe-800 rounded-xl p-5 border border-cafe-100 dark:border-cafe-700 shadow-card">
          <h3 className="text-sm font-semibold text-cafe-700 dark:text-cafe-300 uppercase tracking-wide mb-4">
            Pedidos por hora del día
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calcularHoraPico(pedidos)} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#52b78820" />
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#84cba8' }}
                tickFormatter={v => v.replace(':00', 'h')} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#84cba8' }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value + ' pedidos', 'Hora']}
                contentStyle={{ backgroundColor: '#0d2d1f', border: '1px solid #2d6a4f', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#84cba8' }}
              />
              <Bar dataKey="pedidos" radius={[3, 3, 0, 0]}>
                {calcularHoraPico(pedidos).map((entry, i) => (
                  <Cell key={i} fill={entry.esPico ? chartBtn : chartAccent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Sección C: Chat IA ── */}
      <div className="bg-white dark:bg-cafe-800 rounded-xl border border-cafe-100 dark:border-cafe-700 shadow-card overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-cafe-100 dark:border-cafe-700 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
               style={{ background: 'var(--cafe-btn)', transition: 'background 0.8s ease' }}>
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
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-crema-100 dark:bg-cafe-700 text-cafe-800 dark:text-crema-100 rounded-bl-sm whitespace-pre-line'}`}
                style={m.role === 'user' ? { background: 'var(--cafe-btn)', transition: 'background 0.8s ease' } : undefined}
              >
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

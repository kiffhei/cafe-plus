import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const DEBUG_IA = import.meta.env.VITE_DEBUG_IA === 'true'
import {
  BarChart, Bar,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { pedidos as pedidosApi, formatMXN, formatFecha, canalBadge, generarMeses } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getProductImage } from '../lib/productImages'

const TEMA_CHART_PRIMARY = {
  'matcha':       '#52b788',
  'cafe-oscuro':  '#d4a96a',
  'medianoche':   '#a78bfa',
  'terracota':    '#f4a460',
  'pizarra':      '#a3e635',
  'vinyl-dark':   '#d4a843',
  'vinyl-light':  '#b74416',
}
const TEMA_CHART_BTN = {
  'matcha':       '#2d6a4f',
  'cafe-oscuro':  '#7a5230',
  'medianoche':   '#5248c0',
  'terracota':    '#b05520',
  'pizarra':      '#3d5068',
  'vinyl-dark':   '#7a6349',
  'vinyl-light':  '#8b3010',
}

// Colores de marca fijos — Rappi/Uber Eats/DiDi Food son marcas independientes a Café+,
// su color no debe cambiar según el tema activo de la app (solo el de "Local" sí, porque
// es Café+ mismo). Aproximación de sus colores públicos de marca, no logos.
const CANAL_BRAND_COLORS = {
  'Rappi':      '#FF441F',
  'Uber Eats':  '#000000', // negro translúcido — como el branding general de la app Uber
  'DiDi Food':  '#FF7A00',
}
function canalColor(name, colorLocal) {
  return CANAL_BRAND_COLORS[name] ?? colorLocal
}

// Color fijo (independiente del tema) para el radar de clientes fidelizados — dorado,
// evoca "programa de lealtad" sin competir con el acento del tema activo.
const LOYALTY_COLOR = '#d4af37'
// Color fijo (independiente del tema) para el segmento "clientes sin registro" — azul,
// a propósito distante del dorado de arriba, para que ambas categorías se reconozcan
// siempre igual sin importar el tema activo (mismo criterio que LOYALTY_COLOR, aplica
// tanto al radar individual como al comparativo).
const UNREGISTERED_COLOR = '#3b82f6'

// Fotografía de stock genérica por canal — no son fotos de marca, solo ambientación
// (café sirviéndose / chefs trabajando en cocina / auto en movimiento de noche / repartidor
// en moto haciendo una entrega urbana).
const CANAL_FOTOS = {
  local:    'photo-1515442261605-65987783cb6a',
  rappi:    'photo-1676128923106-1f4bf988f347',
  ubereats: 'photo-1758728073289-8f5f76f82fe3',
  didi:     'photo-1636217255573-5f7eafa833f4',
}

// Punto focal por canal (fp-x/fp-y de Unsplash, 0–1) — se deja vacío mientras el recorte por
// defecto (crop=center) enmarque bien al sujeto principal de la foto.
const CANAL_FOTO_FOCO = {}

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

// Meses cubiertos por un rango de fechas (inclusive) — se usa para decidir si hay
// suficiente historial como para que el radar comparativo de fidelización aporte algo
// (con rangos cortos las dos series se ven casi iguales y no se distinguen).
function mesesEnRango(desde, hasta) {
  if (!desde || !hasta) return 0
  const d = new Date(desde)
  const h = new Date(hasta)
  return (h.getFullYear() - d.getFullYear()) * 12 + (h.getMonth() - d.getMonth()) + 1
}

// Clases de grid completas (no interpoladas) para que Tailwind las detecte en build —
// el número de columnas se ajusta al número real de tarjetas visibles, así cuando un
// canal sin ventas desaparece, los restantes se reparten el espacio sin dejar hueco.
const CANAL_GRID_COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

// Mismo criterio que arriba, pero con breakpoint lg (los radares son más anchos que las
// tarjetas de canal) — se usa para que los radares visibles llenen la cinta sin hueco.
const RADAR_GRID_COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-3',
}

// ── Helpers del comparativo de periodos ─────────────────────────

function toISODate(d) {
  return d.toISOString().split('T')[0]
}

const HOY = new Date()
const ANIO_ACTUAL = HOY.getFullYear()

// Lista de meses desde enero 2025 (inicio del histórico sembrado) hasta el mes actual.
function generarMesesDesde(anioInicio, mesInicio) {
  const meses = []
  let d = new Date(HOY.getFullYear(), HOY.getMonth(), 1)
  const limite = new Date(anioInicio, mesInicio - 1, 1)
  while (d >= limite) {
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    meses.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      anio:  d.getFullYear(),
      mes:   d.getMonth(),
      desde: toISODate(d),
      hasta: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    })
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  }
  return meses
}

const MESES_COMPARATIVO  = generarMesesDesde(2025, 1)
const ANIOS_COMPARATIVO  = [...new Set(MESES_COMPARATIVO.map(m => m.anio))].sort((a, b) => b - a)

const COMPARATIVO_MODOS = [
  { key: 'mes_anio', label: 'Mes vs. año anterior' },
  { key: 'anio',     label: 'Año vs. año anterior' },
  { key: 'mes_mes',  label: 'Mes vs. mes' },
]

function periodoMesAnioAnterior(mesObj) {
  const d = new Date(mesObj.anio - 1, mesObj.mes, 1)
  const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    desde: toISODate(d),
    hasta: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  }
}

function periodoAnio(anio) {
  const esActual = anio === ANIO_ACTUAL
  return {
    label: `Año ${anio}`,
    desde: `${anio}-01-01`,
    hasta: esActual ? toISODate(HOY) : `${anio}-12-31`,
  }
}

async function obtenerMetricasPeriodo(desde, hasta) {
  const res = await pedidosApi.getAll({ fecha_desde: desde, fecha_hasta: hasta })
  if (!res.ok) throw new Error(res.message || 'sin datos')
  const data = Array.isArray(res.data) ? res.data : []
  const entregados = data.filter(p => p.estado === 'entregado')
  const totalVentas = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)
  return {
    totalVentas,
    totalPedidos:   data.length,
    ticketPromedio: entregados.length ? totalVentas / entregados.length : 0,
  }
}

// ── KPI card ─────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = 'kpi-value-theme', loading = false }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 label-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
        <p className="text-xs font-medium label-muted uppercase tracking-wide">{label}</p>
      </div>
      {loading ? (
        <div className="h-6 w-3/4 rounded-full animate-pulse skeleton-theme mt-1" />
      ) : (
        <p className={`text-xl font-bold leading-tight truncate ${color}`}>{value}</p>
      )}
      {sub && !loading && <p className="text-xs label-muted mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Tarjeta comparativa (periodo A vs periodo B) ────────────────

function ComparativoCard({ label, labelA, labelB, valueA, valueB, formatter = (v) => v }) {
  const max = Math.max(valueA, valueB, 1)
  const pctA = (valueA / max) * 100
  const pctB = (valueB / max) * 100
  const delta = valueB !== 0 ? ((valueA - valueB) / valueB) * 100 : (valueA > 0 ? 100 : 0)
  const subiendo = delta >= 0

  return (
    <div className="analisis-card modal-surface rounded-xl shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium label-muted uppercase tracking-wide">{label}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          subiendo ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          {subiendo ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-secondary">{labelA}</span>
            <span className="font-semibold text-accent-theme">{formatter(valueA)}</span>
          </div>
          <div className="h-2 rounded-full skeleton-theme-soft overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pctA}%`, background: 'var(--cafe-btn)' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="label-muted">{labelB}</span>
            <span className="font-semibold label-muted">{formatter(valueB)}</span>
          </div>
          <div className="h-2 rounded-full skeleton-theme-soft overflow-hidden">
            <div className="h-full rounded-full opacity-50" style={{ width: `${pctB}%`, background: 'var(--cafe-btn)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de canal de venta ────────────────────────────────────

// Pide el recorte directamente a Unsplash (en vez de depender de object-position en CSS):
// con una tarjeta mucho más ancha que alta, el recorte real que hace el navegador es
// vertical, así que un ajuste horizontal en CSS no tiene efecto — hay que resolverlo en
// el origen con el punto focal (fp-x/fp-y) que entiende el CDN de Unsplash.
function canalFotoUrl(foto, foco) {
  const base = `https://images.unsplash.com/${foto}?w=480&h=170&q=60&fit=crop`
  return foco ? `${base}&crop=focalpoint&fp-x=${foco.x}&fp-y=${foco.y}&fp-z=1` : `${base}&crop=center`
}

function CanalCard({ label, foto, foco, pedidos, ventas, ticketPromedio, pct, color }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border shadow-sm"
         style={{ borderColor: 'var(--cafe-border)' }}>
      <div className="h-24 flex items-center justify-center relative overflow-hidden">
        <img
          src={canalFotoUrl(foto, foco)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px]"
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}99, ${color}66)` }} />
        <span className="relative font-bold text-2xl text-white drop-shadow-sm px-2 text-center">
          {label}
        </span>
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-black/30">
          {pct}%
        </span>
      </div>
      <div className="analisis-card p-3 modal-surface">
        <div className="flex items-center justify-between text-sm">
          <span className="label-muted">{pedidos} pedidos</span>
          <span className="font-semibold text-accent-theme">{formatMXN(ventas)}</span>
        </div>
        <p className="text-sm label-muted mt-0.5">Ticket prom. {formatMXN(ticketPromedio)}</p>
      </div>
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

function calcularRankingProductos(pedidos) {
  const mapa = {}
  const catMap = {}
  pedidos.forEach(p => {
    const items = parseItems(p.items)
    items.forEach(it => {
      const nombre = it.nombre_producto ?? it.nombre ?? it.product_name
      const cat    = it.categoria ?? ''
      if (nombre) {
        mapa[nombre]   = (mapa[nombre]   || 0) + (Number(it.cantidad) || 1)
        catMap[nombre] = catMap[nombre] || cat
      }
    })
  })
  const entries = Object.entries(mapa).sort(([, a], [, b]) => b - a)
  if (entries.length === 0) return { top: null, menos: null }

  const [topNombre, topQty]     = entries[0]
  const [menosNombre, menosQty] = entries[entries.length - 1]

  return {
    top:   { nombre: topNombre,   qty: topQty,   categoria: catMap[topNombre]   || '' },
    menos: { nombre: menosNombre, qty: menosQty, categoria: catMap[menosNombre] || '' },
  }
}

// Ranking completo por producto (unidades y monto) — el top 5 a mostrar y el orden
// se resuelven en el componente según el modo elegido (unidades vs monto).
function calcularRankingProductosDetalle(pedidos) {
  const mapa = {}
  pedidos.forEach(p => {
    parseItems(p.items).forEach(it => {
      const nombre = it.nombre_producto ?? it.nombre ?? it.product_name
      if (!nombre) return
      const cantidad = Number(it.cantidad) || 1
      const monto    = Number(it.subtotal_linea ?? cantidad * Number(it.precio_unitario || 0))
      const prev = mapa[nombre] || { qty: 0, monto: 0 }
      mapa[nombre] = { qty: prev.qty + cantidad, monto: prev.monto + monto }
    })
  })
  return Object.entries(mapa).map(([nombre, v]) => ({ nombre, ...v }))
}

const CANALES_VALIDOS = ['local', 'didi', 'rappi', 'ubereats']

// Defensa contra valores de canal mal capturados en la fuente (ej. "didifood" en vez
// de "didi") — normaliza a la clave canónica más cercana en vez de crear un grupo nuevo.
function normCanal(raw) {
  const v = (raw || 'local').toLowerCase().trim()
  if (CANALES_VALIDOS.includes(v)) return v
  return CANALES_VALIDOS.find(c => v.startsWith(c)) || v
}

function calcularPorCanalDetalle(pedidos) {
  const mapa = {}
  pedidos.forEach(p => {
    const canal = normCanal(p.canal)
    const prev = mapa[canal] || { count: 0, ventas: 0 }
    mapa[canal] = {
      count:  prev.count + 1,
      ventas: prev.ventas + (p.estado === 'entregado' ? parseFloat(p.total || 0) : 0),
    }
  })
  const totalPedidos = pedidos.length
  return Object.entries(mapa)
    .map(([canal, { count, ventas }]) => ({
      canal,
      ...canalBadge(canal),
      foto:           CANAL_FOTOS[canal] || CANAL_FOTOS.local,
      foco:           CANAL_FOTO_FOCO[canal],
      pedidos:        count,
      ventas,
      ticketPromedio: count ? ventas / count : 0,
      pct:            totalPedidos ? Math.round((count / totalPedidos) * 100) : 0,
    }))
    .sort((a, b) => b.pedidos - a.pedidos)
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

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function etiquetaMes(claveAnioMes) {
  const [anio, mes] = claveAnioMes.split('-').map(Number)
  return `${MESES_CORTOS[mes - 1]} ${String(anio).slice(2)}`
}

function siguienteClaveMes(claveAnioMes, offset) {
  const [anio, mes] = claveAnioMes.split('-').map(Number)
  const d = new Date(anio, mes - 1 + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function agruparPorMes(pedidos) {
  const mapa = {}
  pedidos.forEach(p => {
    if (!p.fecha_hora) return
    const clave = String(p.fecha_hora).substring(0, 7) // YYYY-MM
    mapa[clave] = (mapa[clave] || 0) + parseFloat(p.total || 0)
  })
  return Object.entries(mapa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, total]) => ({ clave, total }))
}

// Proyección simple por regresión lineal (mínimos cuadrados) sobre ventas mensuales —
// no es un modelo estadístico avanzado, es una tendencia legible para dar una referencia
// rápida de hacia dónde apunta el negocio, no una predicción precisa.
function calcularForecastMensual(porMes, mesesFuturos = 3) {
  const n = porMes.length
  if (n < 3) return []

  // El mes en curso va a medias (solo lleva los días transcurridos) — si entra a la
  // regresión con el mismo peso que un mes completo, su total artificialmente bajo
  // jala la tendencia hacia abajo. Se excluye del ajuste pero se sigue mostrando como
  // dato real; su lugar en la línea de tiempo se respeta para proyectar los meses siguientes.
  const mesActual = `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, '0')}`
  const completos = porMes.filter(m => m.clave !== mesActual)
  const nc = completos.length
  if (nc < 3) return []

  const xs = completos.map((_, i) => i)
  const ys = completos.map(m => m.total)
  const xMean = xs.reduce((a, b) => a + b, 0) / nc
  const yMean = ys.reduce((a, b) => a + b, 0) / nc
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0)
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0)
  const slope = den ? num / den : 0
  const intercept = yMean - slope * xMean

  const ultimaClaveCompleta = completos[nc - 1].clave
  const ultimaClave = porMes[n - 1].clave // puede ser el mes parcial en curso
  // El mes parcial tampoco se dibuja: su total va a medias y crea una caída visual
  // engañosa justo antes de la proyección. Se construye solo con meses completos.
  const historico = completos.map(m => ({
    mes: etiquetaMes(m.clave),
    real: m.total,
    proyeccion: m.clave === ultimaClaveCompleta ? m.total : null, // puente visual, desde el último mes completo
  }))
  const futuro = Array.from({ length: mesesFuturos }, (_, k) => ({
    mes: etiquetaMes(siguienteClaveMes(ultimaClave, k + 1)),
    real: null,
    proyeccion: Math.max(0, Math.round(intercept + slope * (n + k))),
  }))
  return [...historico, ...futuro]
}

// Visitas de clientes por mes del año (ene-dic, agregado sobre el periodo filtrado) —
// revela estacionalidad en vez de solo la tendencia del rango seleccionado.
// `filtro` acota el set de pedidos (ej. solo canal local, solo clientes fidelizados).
function calcularVisitasPorMes(pedidos, filtro = () => true) {
  const conteo = Array(12).fill(null).map(() => ({ visitas: 0, monto: 0 }))
  pedidos.forEach(p => {
    if (!p.fecha_hora || !filtro(p)) return
    const d = new Date(p.fecha_hora)
    if (isNaN(d.getTime())) return
    const m = d.getMonth()
    conteo[m].visitas += 1
    if (p.estado === 'entregado') conteo[m].monto += parseFloat(p.total || 0)
  })
  return conteo.map(({ visitas, monto }, i) => ({ mes: MESES_CORTOS[i], visitas, monto }))
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
  const { tema, darkMode } = useTheme()
  const TOOLTIP_STYLE = {
    backgroundColor: darkMode ? 'var(--cafe-sb-bg)' : 'rgba(12,12,12,0.88)',
    border: '1px solid var(--cafe-border)',
    borderRadius: '8px',
    color: '#f0ece8',
    fontSize: '12px',
  }
  const TOOLTIP_ITEM_STYLE = { color: '#f0ece8' }
  const chartAccent = TEMA_CHART_PRIMARY[tema] || '#52b788'
  const chartBtn    = TEMA_CHART_BTN[tema]    || '#2d6a4f'
  // Dinámico por tema — antes era un color fijo (#84cba8, verde de Matcha) que no
  // cambiaba con el tema activo y quedaba poco legible en temas no-verdes.
  const TOOLTIP_LABEL_STYLE = { color: chartAccent, fontWeight: '600' }

  // Periodo
  const [periodo, setPeriodo]       = useState('semana')
  const [fechaDesde, setFechaDesde] = useState(PERIODOS.semana.desde)
  const [fechaHasta, setFechaHasta] = useState(PERIODOS.semana.hasta)
  const [mesSel, setMesSel]         = useState('')

  // Datos
  const [kpis, setKpis]               = useState(null)
  const [ventasDia, setVentasDia]     = useState([])
  const [tendencia, setTendencia]     = useState([])
  const [pedidos, setPedidos]         = useState([])
  const [rankingProd, setRankingProd] = useState({ top: null, menos: null })
  const [productosRanking, setProductosRanking] = useState([])
  const [top5Modo, setTop5Modo] = useState('unidades') // 'unidades' | 'monto'
  const top5Productos = useMemo(() => (
    [...productosRanking]
      .sort((a, b) => top5Modo === 'unidades' ? b.qty - a.qty : b.monto - a.monto)
      .slice(0, 5)
  ), [productosRanking, top5Modo])
  const [canalDetalle, setCanalDetalle] = useState([])
  const [visitasMesSinRegistro, setVisitasMesSinRegistro] = useState([])
  const [visitasMesFidelizados, setVisitasMesFidelizados] = useState([])
  // Comparativo de los dos radares anteriores — mismo eje de meses, valor graficado
  // es "visitas" en ambos (el monto va solo en el tooltip) para no mezclar unidades
  // distintas en el mismo radar.
  const visitasMesComparativo = useMemo(() => (
    visitasMesSinRegistro.map((m, i) => ({
      mes: m.mes,
      sinRegistro: m.visitas,
      montoSinRegistro: m.monto,
      fidelizados: visitasMesFidelizados[i]?.visitas || 0,
      montoFidelizados: visitasMesFidelizados[i]?.monto || 0,
    }))
  ), [visitasMesSinRegistro, visitasMesFidelizados])
  // Visibilidad real de cada radar — igual que con las tarjetas de canal, el número de
  // columnas se ajusta a cuántos quedan visibles para que no dejen hueco al desaparecer.
  const sinRegistroVisible = visitasMesSinRegistro.some(m => m.visitas > 0)
  const fidelizadosVisible = visitasMesFidelizados.some(m => m.visitas > 0)
  const comparativoVisible = mesesEnRango(fechaDesde, fechaHasta) >= 6 && (sinRegistroVisible || fidelizadosVisible)
  const radaresVisibles    = [sinRegistroVisible, fidelizadosVisible, comparativoVisible].filter(Boolean).length
  const [forecast, setForecast]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  // Comparativo de periodos
  const [compModo, setCompModo] = useState('mes_anio')
  const [compMesA, setCompMesA] = useState(MESES_COMPARATIVO[0].desde)
  const [compMesB, setCompMesB] = useState(MESES_COMPARATIVO[1]?.desde ?? MESES_COMPARATIVO[0].desde)
  const [compAnio, setCompAnio] = useState(ANIOS_COMPARATIVO[0])
  const [compA, setCompA]       = useState(null)
  const [compB, setCompB]       = useState(null)
  const [compLoading, setCompLoading] = useState(false)
  const [compError, setCompError]     = useState('')

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

      const ranking = calcularRankingProductos(todos)
      setRankingProd(ranking)
      setProductosRanking(calcularRankingProductosDetalle(todos))
      setCanalDetalle(calcularPorCanalDetalle(todos))
      // Ambos radares se acotan a canal local — compras de fidelizados vía didi/rappi/
      // ubereats entran por ese canal y no cuentan aquí (no son lealtad "del local").
      setVisitasMesSinRegistro(calcularVisitasPorMes(todos, p => normCanal(p.canal) === 'local' && !p.id_cliente))
      setVisitasMesFidelizados(calcularVisitasPorMes(todos, p => normCanal(p.canal) === 'local' && !!p.id_cliente))
      setForecast(calcularForecastMensual(agruparPorMes(entregados)))

      // ── KPIs ──
      const totalVentas = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)
      setKpis({
        totalVentas,
        ticketPromedio: entregados.length ? totalVentas / entregados.length : 0,
        totalPedidos:   todos.length,
        canalTop:       calcularTop(todos, 'canal')  || '—',
        productoTop:    ranking.top?.nombre          || '—',
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

  // ── Comparativo de periodos — carga independiente del periodo principal ──

  const cargarComparativo = useCallback(async () => {
    setCompLoading(true); setCompError('')
    try {
      let periodoA, periodoB
      if (compModo === 'anio') {
        periodoA = periodoAnio(compAnio)
        periodoB = periodoAnio(compAnio - 1)
      } else {
        const mesObjA = MESES_COMPARATIVO.find(m => m.desde === compMesA) ?? MESES_COMPARATIVO[0]
        periodoA = mesObjA
        periodoB = compModo === 'mes_mes'
          ? (MESES_COMPARATIVO.find(m => m.desde === compMesB) ?? MESES_COMPARATIVO[1] ?? mesObjA)
          : periodoMesAnioAnterior(mesObjA)
      }
      const [metricasA, metricasB] = await Promise.all([
        obtenerMetricasPeriodo(periodoA.desde, periodoA.hasta),
        obtenerMetricasPeriodo(periodoB.desde, periodoB.hasta),
      ])
      setCompA({ label: periodoA.label, ...metricasA })
      setCompB({ label: periodoB.label, ...metricasB })
    } catch (err) {
      setCompError(`Error de conexión: ${err?.message || String(err)}`)
    } finally {
      setCompLoading(false)
    }
  }, [compModo, compMesA, compMesB, compAnio])

  useEffect(() => { cargarComparativo() }, [cargarComparativo])

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
    } catch {
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
          className="input-cafe text-sm w-44"
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
                : 'btn-ghost-theme'}`}>
            {label}
          </button>
        ))}
        <button onClick={() => seleccionarPeriodo('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${periodo === 'custom'
              ? 'tab-active-theme'
              : 'btn-ghost-theme'}`}>
          Personalizado
        </button>
        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="input-cafe text-sm w-36" />
            <span className="label-muted">—</span>
            <input type="date" value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="input-cafe text-sm w-36" />
            <button onClick={cargar} className="btn-primary text-sm px-4 py-2">
              Aplicar
            </button>
          </div>
        )}
        {loading && (
          <span className="w-4 h-4 border-2 spinner-theme
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
          color="text-accent-theme"
          loading={loading} />
        <KpiCard icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" label="Ticket promedio"
          value={formatMXN(kpis?.ticketPromedio ?? 0)}
          sub="por pedido"
          loading={loading} />
        <KpiCard icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" label="Total pedidos"
          value={kpis?.totalPedidos ?? '—'}
          sub="en el periodo"
          loading={loading} />
        <KpiCard icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" label="Canal top"
          value={kpis ? canalBadge(kpis.canalTop).label : '—'}
          sub="más pedidos"
          color="text-accent-theme"
          loading={loading} />
        <KpiCard icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" label="Producto top"
          value={kpis?.productoTop ?? '—'}
          sub="más vendido"
          loading={loading} />
      </div>

      {/* Skeleton mientras carga — evita el salto de layout de las gráficas */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl h-48 animate-pulse skeleton-theme-soft" />
            <div className="rounded-2xl h-48 animate-pulse skeleton-theme-soft" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 analisis-card modal-surface rounded-xl shadow-card p-4 animate-pulse">
              <div className="h-4 w-32 rounded-full skeleton-theme mb-4" />
              <div className="h-[220px] rounded-xl skeleton-theme-soft" />
            </div>
            <div className="analisis-card modal-surface rounded-xl shadow-card p-4 animate-pulse">
              <div className="h-4 w-24 rounded-full skeleton-theme mb-4" />
              <div className="h-[200px] rounded-xl skeleton-theme-soft" />
            </div>
          </div>
          <div className="analisis-card modal-surface rounded-xl shadow-card p-4 animate-pulse">
            <div className="h-4 w-40 rounded-full skeleton-theme mb-4" />
            <div className="h-[180px] rounded-xl skeleton-theme-soft" />
          </div>
          <div className="analisis-card modal-surface rounded-xl p-5 shadow-card animate-pulse">
            <div className="h-4 w-48 rounded-full skeleton-theme mb-4" />
            <div className="h-[200px] rounded-xl skeleton-theme-soft" />
          </div>
        </div>
      )}

      {/* ── Sección B: Destaca del Período ── */}
      {!loading && (rankingProd.top || rankingProd.menos) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Más vendido */}
          {rankingProd.top && (
            <div className="relative rounded-2xl overflow-hidden border shadow-sm"
                 style={{ borderColor: 'var(--cafe-border)' }}>
              <img
                src={getProductImage(rankingProd.top.nombre, rankingProd.top.categoria, 800)}
                alt={rankingProd.top.nombre}
                className="w-full h-48 object-cover"
                onError={e => { e.target.src = getProductImage('café', 'café', 800) }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              {/* Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                   style={{ background: 'var(--cafe-btn)' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                Más vendido
              </div>
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white/60 text-xs capitalize mb-0.5">{rankingProd.top.categoria || 'producto'}</p>
                <p className="text-white font-bold text-lg leading-tight line-clamp-2">{rankingProd.top.nombre}</p>
                <p className="text-white/70 text-xs mt-1">{rankingProd.top.qty} unidades vendidas en el periodo</p>
              </div>
            </div>
          )}

          {/* Menos vendido */}
          {rankingProd.menos && rankingProd.menos.nombre !== rankingProd.top?.nombre && (
            <div className="relative rounded-2xl overflow-hidden border shadow-sm"
                 style={{ borderColor: 'var(--cafe-border)' }}>
              <img
                src={getProductImage(rankingProd.menos.nombre, rankingProd.menos.categoria, 800)}
                alt={rankingProd.menos.nombre}
                className="w-full h-48 object-cover grayscale-[30%]"
                onError={e => { e.target.src = getProductImage('café', 'café', 800) }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
              {/* Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gray-600/80">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                </svg>
                Menos vendido
              </div>
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white/60 text-xs capitalize mb-0.5">{rankingProd.menos.categoria || 'producto'}</p>
                <p className="text-white font-bold text-lg leading-tight line-clamp-2">{rankingProd.menos.nombre}</p>
                <p className="text-white/70 text-xs mt-1">{rankingProd.menos.qty} unidades en el periodo · considerar promoción</p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Sección C: Gráficas ── */}
      {/* GRAFICA_1_AREA: ventas por día + promedio móvil 7d, GRAFICA_1B: top 5 productos */}
      {!loading && ventasDia.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 analisis-card modal-surface rounded-xl shadow-card p-4">
            <h3 className="text-sm font-semibold text-accent-theme mb-4">Ventas por día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartAccent} strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: chartAccent }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: chartAccent }} tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip
                  cursor={{ fill: chartAccent, fillOpacity: 0.08 }}
                  formatter={(value) => [formatMXN(value), 'Ventas']}
                  labelFormatter={(label) => `Día: ${label}`}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Bar dataKey="Ventas" fill={chartBtn} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {top5Productos.length > 0 && (
            <div className="analisis-card modal-surface rounded-xl shadow-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-accent-theme">Top 5 productos</h3>
                <div className="flex gap-1">
                  <button onClick={() => setTop5Modo('unidades')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all
                      ${top5Modo === 'unidades' ? 'tab-active-theme' : 'btn-ghost-theme'}`}>
                    Unidades
                  </button>
                  <button onClick={() => setTop5Modo('monto')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all
                      ${top5Modo === 'monto' ? 'tab-active-theme' : 'btn-ghost-theme'}`}>
                    Monto
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={top5Productos} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartAccent} strokeOpacity={0.15} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: chartAccent }} tickLine={false}
                    allowDecimals={false}
                    tickFormatter={v => top5Modo === 'monto' ? `$${(v / 1000).toFixed(0)}k` : v} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: chartAccent }}
                    tickLine={false} width={88}
                    tickFormatter={v => v.length > 13 ? `${v.slice(0, 12)}…` : v} />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${props.payload.qty} unidades · ${formatMXN(props.payload.monto)}`, 'Vendidos',
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                  />
                  <Bar dataKey={top5Modo === 'unidades' ? 'qty' : 'monto'} radius={[0, 6, 6, 0]} maxBarSize={16}>
                    {top5Productos.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? chartBtn : chartAccent} fillOpacity={i === 0 ? 1 : 0.85 - i * 0.13} />
                    ))}
                    <LabelList
                      dataKey={top5Modo === 'unidades' ? 'qty' : 'monto'}
                      position="right"
                      formatter={v => top5Modo === 'unidades' ? `${v} u.` : formatMXN(v)}
                      style={{ fontSize: 10, fill: chartAccent }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* GRAFICA_3_LINE */}
      {!loading && tendencia.length > 1 && (
        <div className="analisis-card modal-surface rounded-xl shadow-card p-4">
          <h3 className="text-sm font-semibold text-accent-theme mb-4">Tendencia acumulada</h3>
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

      {/* ── Sección C-bis: Canales de venta ── (separada de "Destaca del Período" a propósito:
           dos bloques con fotos consecutivos se sentían monótonos — ahora hay 3 gráficas entre medio) */}
      {!loading && canalDetalle.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-accent-theme mb-3">Canales de venta</h3>
          <div className={`grid ${CANAL_GRID_COLS[Math.min(canalDetalle.length, 4)] || CANAL_GRID_COLS[4]} gap-4`}>
            {canalDetalle.map(c => (
              <CanalCard key={c.canal} {...c} color={canalColor(c.label, chartBtn)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Sección C-ter: Comparativo de periodos ── */}
      <div className="analisis-card modal-surface rounded-xl shadow-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-sm font-semibold text-accent-theme">Comparativo de periodos</h3>
          <div className="flex gap-1.5 flex-wrap">
            {COMPARATIVO_MODOS.map(m => (
              <button key={m.key} onClick={() => setCompModo(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${compModo === m.key ? 'tab-active-theme' : 'btn-ghost-theme'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {compModo !== 'anio' && (
            <select value={compMesA} onChange={e => setCompMesA(e.target.value)} className="input-cafe text-sm">
              {MESES_COMPARATIVO.map(m => <option key={m.desde} value={m.desde}>{m.label}</option>)}
            </select>
          )}
          {compModo === 'mes_mes' && (
            <>
              <span className="label-muted text-xs">vs.</span>
              <select value={compMesB} onChange={e => setCompMesB(e.target.value)} className="input-cafe text-sm">
                {MESES_COMPARATIVO.map(m => <option key={m.desde} value={m.desde}>{m.label}</option>)}
              </select>
            </>
          )}
          {compModo === 'anio' && (
            <select value={compAnio} onChange={e => setCompAnio(Number(e.target.value))} className="input-cafe text-sm">
              {ANIOS_COMPARATIVO.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {compLoading && (
            <span className="w-4 h-4 border-2 spinner-theme rounded-full animate-spin" />
          )}
        </div>

        {compError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                          rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {compError}
          </div>
        )}

        {!compError && compA && compB && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComparativoCard label="Ventas totales" labelA={compA.label} labelB={compB.label}
              valueA={compA.totalVentas} valueB={compB.totalVentas} formatter={formatMXN} />
            <ComparativoCard label="Pedidos" labelA={compA.label} labelB={compB.label}
              valueA={compA.totalPedidos} valueB={compB.totalPedidos} />
            <ComparativoCard label="Ticket promedio" labelA={compA.label} labelB={compB.label}
              valueA={compA.ticketPromedio} valueB={compB.ticketPromedio} formatter={formatMXN} />
          </div>
        )}
      </div>

      {/* Estado vacío si no hay datos */}
      {!loading && !error && ventasDia.length === 0 && (
        <div className="analisis-card modal-surface rounded-xl shadow-card text-center py-12">
          <svg className="w-10 h-10 mx-auto mb-3 label-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p className="text-ink-secondary font-medium">
            Sin datos de ventas en este periodo
          </p>
        </div>
      )}

      {/* ── Sección D: Hora pico ── */}
      {!loading && pedidos.length > 0 && (
        <div className="analisis-card modal-surface rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide mb-4">
            Pedidos por hora del día
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calcularHoraPico(pedidos)} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartAccent} strokeOpacity={0.12} />
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: chartAccent }}
                tickFormatter={v => v.replace(':00', 'h')} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: chartAccent }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value + ' pedidos', 'Hora']}
                contentStyle={TOOLTIP_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
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

      {/* ── Sección D-bis: Visitas de clientes por mes (estacionalidad, solo Local) ── */}
      {!loading && radaresVisibles > 0 && (
        <div className={`grid ${RADAR_GRID_COLS[radaresVisibles] || RADAR_GRID_COLS[3]} gap-4`}>
          {sinRegistroVisible && (
            <div className="analisis-card modal-surface rounded-xl p-5 shadow-card">
              <div className="min-h-[56px] mb-3">
                <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">
                  Clientes sin registro · Local
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={visitasMesSinRegistro} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
                  <PolarGrid stroke={UNREGISTERED_COLOR} strokeOpacity={0.2} />
                  <PolarAngleAxis dataKey="mes" tick={{ fontSize: 11, fill: UNREGISTERED_COLOR }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: UNREGISTERED_COLOR }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name, props) => [`${value} visitas · ${formatMXN(props.payload.monto)}`, 'Sin registro']}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={{ color: UNREGISTERED_COLOR, fontWeight: '600' }}
                  />
                  <Radar dataKey="visitas" stroke={UNREGISTERED_COLOR} fill={UNREGISTERED_COLOR} fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {fidelizadosVisible && (
            <div className="analisis-card modal-surface rounded-xl p-5 shadow-card">
              <div className="min-h-[56px] mb-3">
                <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">
                  Clientes fidelizados · Local
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={visitasMesFidelizados} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
                  <PolarGrid stroke={LOYALTY_COLOR} strokeOpacity={0.2} />
                  <PolarAngleAxis dataKey="mes" tick={{ fontSize: 11, fill: LOYALTY_COLOR }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: LOYALTY_COLOR }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name, props) => [`${value} visitas · ${formatMXN(props.payload.monto)}`, 'Fidelizados']}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={{ color: LOYALTY_COLOR, fontWeight: '600' }}
                  />
                  <Radar dataKey="visitas" stroke={LOYALTY_COLOR} fill={LOYALTY_COLOR} fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {comparativoVisible && (
            <div className="analisis-card modal-surface rounded-xl p-5 shadow-card">
              <div className="min-h-[56px] mb-3">
                <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide mb-1">
                  Comparativo · Sin registro vs. Fidelizados (Local)
                </h3>
                <p className="text-[11px] text-ink-secondary opacity-70">
                  Con rangos cortos las dos series se ven casi iguales — se muestra desde 6 meses de historial.
                </p>
              </div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={visitasMesComparativo} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
                    <PolarGrid stroke={chartAccent} strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="mes" tick={{ fontSize: 11, fill: chartAccent }} />
                    <PolarRadiusAxis tick={{ fontSize: 9, fill: chartAccent }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name, props) => {
                        const monto = name === 'Sin registro' ? props.payload.montoSinRegistro : props.payload.montoFidelizados
                        return [`${value} visitas · ${formatMXN(monto)}`, name]
                      }}
                      contentStyle={TOOLTIP_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: chartAccent }} />
                    <Radar dataKey="sinRegistro" name="Sin registro" stroke={UNREGISTERED_COLOR} strokeWidth={2}
                      fill={UNREGISTERED_COLOR} fillOpacity={0.45} dot={{ r: 2, fill: UNREGISTERED_COLOR }} />
                    <Radar dataKey="fidelizados" name="Fidelizados" stroke={LOYALTY_COLOR} strokeWidth={2}
                      fill={LOYALTY_COLOR} fillOpacity={0.45} dot={{ r: 2, fill: LOYALTY_COLOR }} />
                  </RadarChart>
                </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Sección D-ter: Forecast de ventas (proyección 3 meses) ── */}
      {!loading && forecast.length > 0 && (
        <div className="analisis-card modal-surface rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">
              Forecast de ventas
            </h3>
          </div>
          <p className="text-[11px] text-ink-secondary opacity-70 mb-4">
            Proyección por tendencia lineal sobre meses completos del rango seleccionado
            (el mes en curso no se muestra, va a medias y distorsiona la tendencia) —
            necesita 3+ meses completos para calcularse; con "Esta semana" o "Este mes"
            no hay suficiente historial y la tarjeta no aparece.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={forecast} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartAccent} strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: chartAccent }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: chartAccent }} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip
                formatter={(value, name) => [formatMXN(value), name]}
                contentStyle={TOOLTIP_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: chartAccent }} />
              <Line type="monotone" dataKey="real" name="Ventas reales" stroke={chartBtn} strokeWidth={2}
                dot={{ r: 3, fill: chartBtn }} connectNulls={false} />
              <Line type="monotone" dataKey="proyeccion" name="Proyección" stroke={chartAccent} strokeWidth={2}
                strokeDasharray="5 4" dot={{ r: 3, fill: chartAccent }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Sección C: Chat IA ── */}
      <div className="analisis-card modal-surface rounded-xl shadow-card overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b cafe-border-theme flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
               style={{ background: 'var(--cafe-btn)', transition: 'background 0.8s ease' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              Agente IA — Análisis de ventas
            </p>
            <p className="text-xs label-muted">
              Pregunta sobre tus datos del periodo seleccionado
            </p>
          </div>
        </div>

        {/* Chips de pregunta rápida */}
        <div className="px-5 pt-3 pb-1 flex gap-2 flex-wrap">
          {PREGUNTAS_RAPIDAS.map((q, i) => (
            <button key={i} onClick={() => enviarMensaje(q)} disabled={enviando}
              className="px-3 py-1.5 rounded-full text-xs font-medium
                         surface-soft-theme text-ink-secondary
                         border cafe-border-theme
                         disabled:opacity-50 transition-all">
              {q}
            </button>
          ))}
        </div>

        {/* Historial de mensajes */}
        <div className="px-5 py-3 min-h-[160px] max-h-80 overflow-y-auto space-y-3">
          {mensajes.length === 0 && (
            <p className="text-xs label-muted text-center py-8">
              Usa un chip o escribe tu pregunta para empezar
            </p>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'surface-soft-theme text-ink rounded-bl-sm whitespace-pre-line'}`}
                style={m.role === 'user' ? { background: 'var(--cafe-btn)', transition: 'background 0.8s ease' } : undefined}
              >
                {m.texto}
              </div>
            </div>
          ))}
          {/* Indicador "escribiendo..." */}
          {enviando && (
            <div className="flex justify-start">
              <div className="surface-soft-theme px-4 py-3
                              rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span key={i}
                    className="w-1.5 h-1.5 skeleton-theme rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 pb-5 pt-2 border-t cafe-border-theme">
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

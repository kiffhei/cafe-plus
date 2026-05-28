import { useState, useEffect, useCallback } from 'react'
import { analytics, formatMXN, formatFecha } from '../api/api'

function fechaHoyMX() {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date()).split('/').reverse().join('-')
}

function fechaHaceDias(dias) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(Date.now() - dias * 86400000)).split('/').reverse().join('-')
}

const CANAL_CONFIG = {
  local:    { label: 'Local',     color: '#6B7C3D' },
  didi:     { label: 'DiDi Food', color: '#f97316' },
  rappi:    { label: 'Rappi',     color: '#16a34a' },
  ubereats: { label: 'Uber Eats', color: '#1f2937' },
}

const RANGOS = [
  { label: 'Hoy',          desde: () => fechaHoyMX(),        hasta: () => fechaHoyMX() },
  { label: '7 días',       desde: () => fechaHaceDias(7),    hasta: () => fechaHoyMX() },
  { label: '30 días',      desde: () => fechaHaceDias(30),   hasta: () => fechaHoyMX() },
  { label: 'Este mes',     desde: () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01` }, hasta: () => fechaHoyMX() },
  { label: 'Personalizado', custom: true },
]

function KPICard({ label, value, sub, accent }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-cafe-400 dark:text-cafe-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-cafe-800 dark:text-crema-100'}`}>{value}</p>
      {sub && <p className="text-xs text-cafe-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarraHorizontal({ label, value, max, color, sublabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-cafe-700 dark:text-crema-200 font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-xs text-cafe-500 dark:text-cafe-400 ml-2 shrink-0">{sublabel || value}</span>
      </div>
      <div className="h-2 bg-crema-200 dark:bg-cafe-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color || '#8B4513' }} />
      </div>
    </div>
  )
}

function GraficaBarras({ data, keyX, keyY, color }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d[keyY]))
  return (
    <div className="flex items-end gap-1 h-40 mt-2">
      {data.map((d, i) => {
        const pct = max > 0 ? (d[keyY] / max) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cafe-800 dark:bg-crema-100 text-crema-100 dark:text-cafe-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {formatMXN(d[keyY])}
            </div>
            <div className="w-full rounded-t transition-all duration-500"
              style={{ height: `${Math.max(pct, 2)}%`, background: color || '#8B4513', opacity: 0.85 }} />
            <span className="text-[9px] text-cafe-400 dark:text-cafe-500 truncate w-full text-center">{d[keyX]}</span>
          </div>
        )
      })}
    </div>
  )
}

function PieSimple({ data }) {
  if (!data?.length) return null
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  let offset = 0
  const radius = 60
  const cx = 70, cy = 70

  const slices = data.map(d => {
    const pct = d.value / total
    const angle = pct * 360
    const startAngle = offset
    offset += angle
    return { ...d, pct, startAngle, angle }
  })

  function polarToCart(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function slicePath(cx, cy, r, startAngle, angle) {
    if (angle >= 360) return `M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx-0.001} ${cy-r} Z`
    const start = polarToCart(cx, cy, r, startAngle)
    const end   = polarToCart(cx, cy, r, startAngle + angle)
    const large = angle > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`
  }

  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {slices.map((s, i) => (
          <path key={i} d={slicePath(cx, cy, radius, s.startAngle, s.angle)}
            fill={s.color} opacity={0.9} />
        ))}
        <circle cx={cx} cy={cy} r={28} fill="white" className="dark:fill-cafe-800" />
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-cafe-600 dark:text-cafe-300">{s.label}</span>
            <span className="text-xs font-semibold text-cafe-800 dark:text-crema-100 ml-1">
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analisis() {
  const hoy = fechaHoyMX()
  const [rangoIdx,  setRangoIdx]  = useState(1)
  const [desde,     setDesde]     = useState(fechaHaceDias(7))
  const [hasta,     setHasta]     = useState(hoy)
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  const cargar = useCallback(async (d, h) => {
    setLoading(true); setError('')
    try {
      const res = await analytics.getPeriodo(d, h)
      if (res.ok) setData(res.data)
      else setError(res.message || 'Error al cargar análisis')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar(desde, hasta) }, [])

  function aplicarRango(idx) {
    setRangoIdx(idx)
    if (RANGOS[idx].custom) return
    const d = RANGOS[idx].desde()
    const h = RANGOS[idx].hasta()
    setDesde(d); setHasta(h)
    cargar(d, h)
  }

  // Formatear datos
  const porDiaFmt = (data?.por_dia || []).map(d => ({
    dia: d.dia.substring(5),
    total: d.total
  })).slice(-14) // últimos 14 días max

  const porCanalFmt = (data?.por_canal || []).map(c => ({
    label: CANAL_CONFIG[c.canal]?.label || c.canal,
    value: c.total,
    color: CANAL_CONFIG[c.canal]?.color || '#8B4513',
  }))

  const maxCanal = Math.max(...porCanalFmt.map(c => c.value), 1)

  const topProdFmt = (data?.top_productos || []).slice(0, 5)
  const maxProd = topProdFmt.length > 0 ? topProdFmt[0].cantidad : 1

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Selector de rango */}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-3">
          {RANGOS.map((r, i) => (
            <button key={i} onClick={() => aplicarRango(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${rangoIdx === i
                  ? 'bg-cafe-700 text-crema-100'
                  : 'bg-crema-100 dark:bg-cafe-700 border border-cafe-200 dark:border-cafe-600 text-cafe-600 dark:text-cafe-300 hover:bg-crema-200 dark:hover:bg-cafe-600'}`}>
              {r.label}
            </button>
          ))}
        </div>
        {rangoIdx === 4 && (
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="input-cafe text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-500 dark:text-cafe-400 mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="input-cafe text-sm" />
            </div>
            <button onClick={() => cargar(desde, hasta)} className="btn-primary text-sm py-2">
              Aplicar
            </button>
          </div>
        )}
        {data && !loading && (
          <p className="text-xs text-cafe-400 mt-2">
            {desde} → {hasta}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-cafe-400">
          <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3"/>
          Cargando análisis...
        </div>
      ) : !data || data.kpis.num_pedidos === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-cafe-500 dark:text-cafe-400 font-medium">Sin datos en el período seleccionado</p>
          <p className="text-cafe-400 text-sm mt-1">Prueba con un rango más amplio</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Ventas totales"   value={formatMXN(data.kpis.total_ventas)}    sub="en el período"    accent="text-terracota-500" />
            <KPICard label="Pedidos"           value={data.kpis.num_pedidos}                sub="en el período" />
            <KPICard label="Ticket promedio"   value={formatMXN(data.kpis.ticket_promedio)} sub="por pedido"       accent="text-olivo-600 dark:text-olivo-400" />
            <KPICard label="Hora pico"         value={data.kpis.hora_pico}                  sub="más pedidos" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Ventas por día */}
            {porDiaFmt.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-2">Ventas por día</h3>
                <GraficaBarras data={porDiaFmt} keyX="dia" keyY="total" color="#8B4513" />
              </div>
            )}

            {/* Por canal */}
            {porCanalFmt.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">Ventas por canal</h3>
                <PieSimple data={porCanalFmt} />
                <div className="mt-4 space-y-1">
                  {porCanalFmt.map((c, i) => (
                    <BarraHorizontal key={i}
                      label={c.label}
                      value={c.value}
                      max={maxCanal}
                      color={c.color}
                      sublabel={formatMXN(c.value)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top productos */}
            {topProdFmt.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">Top 5 productos</h3>
                {topProdFmt.map((p, i) => (
                  <BarraHorizontal key={i}
                    label={`${i+1}. ${p.nombre}`}
                    value={p.cantidad}
                    max={maxProd}
                    color={i === 0 ? '#C1440E' : '#8B4513'}
                    sublabel={`${p.cantidad} uds · ${formatMXN(p.total)}`}
                  />
                ))}
              </div>
            )}

            {/* Por cajero */}
            {data.por_cajero?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">Por cajero</h3>
                <div className="space-y-3">
                  {data.por_cajero.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-crema-50 dark:bg-cafe-900/50 rounded-xl border border-cafe-100 dark:border-cafe-700">
                      <div className="w-9 h-9 rounded-full bg-cafe-500 flex items-center justify-center text-crema-100 font-bold text-sm shrink-0">
                        {c.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cafe-800 dark:text-crema-100 truncate">{c.nombre}</p>
                        <p className="text-xs text-cafe-400">{c.pedidos} pedido{c.pedidos !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-sm font-bold text-terracota-500 shrink-0">{formatMXN(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

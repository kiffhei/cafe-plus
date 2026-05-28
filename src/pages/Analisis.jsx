import { useState, useEffect, useCallback } from 'react'
import { analytics, formatMXN } from '../api/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

const COLORES_CANAL = {
  local:    '#6B7C3D',
  didi:     '#f97316',
  rappi:    '#16a34a',
  ubereats: '#1f2937',
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

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

function KPICard({ label, value, sub, color = 'text-cafe-800 dark:text-crema-100', bg = 'card' }) {
  return (
    <div className={`${bg} flex flex-col gap-1`}>
      <p className="text-xs font-medium text-cafe-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-cafe-400">{sub}</p>}
    </div>
  )
}

const TooltipMXN = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-cafe-800 border border-cafe-200 dark:border-cafe-600 rounded-xl px-3 py-2 shadow-warm text-sm">
      <p className="text-cafe-500 dark:text-cafe-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {formatMXN(p.value)}
        </p>
      ))}
    </div>
  )
}

const RANGOS = [
  { label: 'Hoy',        dias: 0 },
  { label: '7 días',     dias: 7 },
  { label: '30 días',    dias: 30 },
  { label: 'Este mes',   dias: null, tipo: 'mes' },
  { label: 'Personalizado', dias: null, tipo: 'custom' },
]

export default function Analisis() {
  const hoy    = fechaHoyMX()
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
    const r = RANGOS[idx]
    if (r.tipo === 'custom') return
    let d, h = hoy
    if (r.dias === 0)        d = hoy
    else if (r.dias)         d = fechaHaceDias(r.dias)
    else if (r.tipo === 'mes') {
      const now = new Date()
      d = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    }
    setDesde(d); setHasta(h)
    cargar(d, h)
  }

  function aplicarPersonalizado() {
    cargar(desde, hasta)
  }

  // Formatear datos para gráficas
  const porDiaFmt = data?.por_dia?.map(d => ({
    dia:   d.dia.substring(5),
    total: d.total
  })) || []

  const porCanalFmt = data?.por_canal?.map(c => ({
    name:  { local:'Local', didi:'DiDi Food', rappi:'Rappi', ubereats:'Uber Eats' }[c.canal] || c.canal,
    value: c.total,
    color: COLORES_CANAL[c.canal] || '#8B4513'
  })) || []

  const topProdFmt = data?.top_productos?.slice(0,5).map(p => ({
    nombre:   p.nombre.length > 18 ? p.nombre.substring(0,16)+'…' : p.nombre,
    cantidad: p.cantidad,
    total:    p.total
  })) || []

  return (
    <div className="space-y-6">

      {/* Selector de rango */}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-3">
          {RANGOS.map((r, i) => (
            <button key={i} onClick={() => aplicarRango(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${rangoIdx === i
                  ? 'bg-cafe-700 text-crema-100'
                  : 'bg-crema-100 dark:bg-cafe-700 text-cafe-600 dark:text-cafe-300 hover:bg-crema-200 dark:hover:bg-cafe-600 border border-cafe-200 dark:border-cafe-600'}`}>
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
            <button onClick={aplicarPersonalizado}
              className="btn-primary text-sm py-2 px-4">
              Aplicar
            </button>
          </div>
        )}
        {data && (
          <p className="text-xs text-cafe-400 mt-2">
            Período: {desde} → {hasta}
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
            <KPICard
              label="Ventas totales"
              value={formatMXN(data.kpis.total_ventas)}
              sub="en el período"
              color="text-terracota-500"
            />
            <KPICard
              label="Pedidos"
              value={data.kpis.num_pedidos}
              sub="en el período"
            />
            <KPICard
              label="Ticket promedio"
              value={formatMXN(data.kpis.ticket_promedio)}
              sub="por pedido"
              color="text-olivo-600 dark:text-olivo-400"
            />
            <KPICard
              label="Hora pico"
              value={data.kpis.hora_pico}
              sub="más pedidos"
              color="text-cafe-700 dark:text-crema-200"
            />
          </div>

          {/* Gráfica de ventas por día */}
          {porDiaFmt.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
                Ventas por día
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porDiaFmt} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8c9a0" opacity={0.5} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#c08040' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#c08040' }}
                    tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipMXN />} />
                  <Bar dataKey="total" fill="#8B4513" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pie por canal */}
            {porCanalFmt.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
                  Ventas por canal
                </h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={180}>
                    <PieChart>
                      <Pie data={porCanalFmt} dataKey="value" cx="50%" cy="50%"
                        outerRadius={70} innerRadius={35}>
                        {porCanalFmt.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMXN(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 text-xs">
                    {porCanalFmt.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                        <span className="text-cafe-600 dark:text-cafe-300">{c.name}</span>
                        <span className="font-semibold text-cafe-800 dark:text-crema-100 ml-auto">
                          {formatMXN(c.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top productos */}
            {topProdFmt.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
                  Top 5 productos
                </h3>
                <div className="space-y-2.5">
                  {topProdFmt.map((p, i) => {
                    const maxCant = topProdFmt[0].cantidad
                    const pct = Math.round((p.cantidad / maxCant) * 100)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-cafe-700 dark:text-crema-200 font-medium">
                            {i+1}. {p.nombre}
                          </span>
                          <span className="text-cafe-500 dark:text-cafe-400">
                            {p.cantidad} uds · {formatMXN(p.total)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-crema-200 dark:bg-cafe-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cafe-500 to-terracota-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Por cajero */}
          {data.por_cajero?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-cafe-700 dark:text-crema-200 mb-4">
                Rendimiento por cajero
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.por_cajero.map((c, i) => (
                  <div key={i} className="bg-crema-50 dark:bg-cafe-900/50 rounded-xl p-4 border border-cafe-100 dark:border-cafe-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-cafe-500 flex items-center justify-center text-crema-100 text-sm font-bold shrink-0">
                        {c.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <p className="text-sm font-semibold text-cafe-800 dark:text-crema-100 truncate">{c.nombre}</p>
                    </div>
                    <div className="flex justify-between text-xs text-cafe-500 dark:text-cafe-400">
                      <span>{c.pedidos} pedido{c.pedidos !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-terracota-500">{formatMXN(c.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

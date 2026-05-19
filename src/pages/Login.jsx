import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api/api'

export default function Login() {
  const [form,    setForm]    = useState({ usuario: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.usuario || !form.password) { setError('Ingresa usuario y contraseña'); return }
    setLoading(true); setError('')
    try {
      const res = await auth.login(form.usuario, form.password)
      if (res.ok) { login(res.data, res.data.token); navigate('/', { replace: true }) }
      else setError(res.message || 'Credenciales incorrectas')
    } catch { setError('Error de conexión. Verifica tu red.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-cafe-900 overflow-hidden relative">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cafe-800 via-cafe-900 to-cafe-900" />
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:`radial-gradient(circle at 20% 50%, #C1440E 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B4513 0%, transparent 40%)`}} />
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border border-cafe-700 opacity-30" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full border border-cafe-700 opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-terracota-500 flex items-center justify-center shadow-warm-lg">
              <span className="text-white font-bold text-lg">C+</span>
            </div>
            <span className="text-crema-100 text-xl font-semibold">Café Plus</span>
          </div>
          <h2 className="text-crema-100 text-4xl font-bold leading-tight mb-4">
            El sabor de la<br /><span className="text-terracota-400">eficiencia</span>
          </h2>
          <p className="text-cafe-400 text-base leading-relaxed max-w-xs">
            Sistema de gestión diseñado para cafeterías que trabajan con pasión. Cuautitlán, Estado de México.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[{label:'Pedidos hoy',value:'—'},{label:'Clientes Plus',value:'—'},{label:'Producto top',value:'—'},{label:'Ventas del día',value:'—'}].map(s => (
            <div key={s.label} className="bg-cafe-800/60 backdrop-blur-sm rounded-xl p-4 border border-cafe-700">
              <p className="text-cafe-400 text-xs font-medium mb-1">{s.label}</p>
              <p className="text-crema-200 font-semibold text-lg">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative bg-crema-50">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:`radial-gradient(circle, #d4a96a 1px, transparent 1px)`,backgroundSize:'24px 24px'}} />
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-terracota-500 flex items-center justify-center">
              <span className="text-white font-bold">C+</span>
            </div>
            <span className="text-cafe-800 text-lg font-semibold">Café Plus</span>
          </div>
          <div className="mb-8">
            <h1 className="text-cafe-800 text-3xl font-bold mb-1">Bienvenido</h1>
            <p className="text-cafe-400 text-sm">Ingresa tus credenciales para continuar</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-cafe-700 text-sm font-medium mb-1.5">Usuario</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </span>
                <input type="text" className="input-field pl-9" placeholder="tu_usuario"
                  value={form.usuario} onChange={e => setForm(f => ({...f, usuario: e.target.value}))}
                  autoComplete="username" autoFocus />
              </div>
            </div>
            <div>
              <label className="block text-cafe-700 text-sm font-medium mb-1.5">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </span>
                <input type={showPw ? 'text' : 'password'} className="input-field pl-9 pr-10" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cafe-400 hover:text-cafe-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPw
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center gap-2 animate-fade-in">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 text-base">
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Verificando...</>
              ) : 'Ingresar al sistema'}
            </button>
          </form>
          <p className="text-center text-cafe-300 text-xs mt-8">Café Plus · Sistema de Gestión v1.0</p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { usuarios as usuariosApi } from '../api/api'

const ROLES = ['admin', 'cajero']

function ModalUsuario({ usuario, onClose, onSaved }) {
  const esNuevo = !usuario?.id_usuario
  const [form, setForm] = useState({
    nombre:    usuario?.nombre    || '',
    apellidos: usuario?.apellidos || '',
    edad:      usuario?.edad      || '',
    categoria: usuario?.categoria || 'cajero',
    usuario:   usuario?.usuario   || '',
    password:  '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setError('')
    if (!form.nombre || !form.apellidos || !form.usuario) {
      setError('Nombre, apellidos y usuario son requeridos'); return
    }
    if (esNuevo && !form.password) {
      setError('La contraseña es requerida para usuarios nuevos'); return
    }
    setLoading(true)
    try {
      const payload = esNuevo
        ? { ...form }
        : { id_usuario: usuario.id_usuario, ...form }
      const res = esNuevo
        ? await usuariosApi.create(payload)
        : await usuariosApi.update(payload)
      if (!res.ok) { setError(res.message); return }
      onSaved()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-surface rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crema-200">
          <h2 className="text-lg font-semibold text-cafe-800 dark:text-crema-100">
            {esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-crema-100 text-cafe-400 hover:text-cafe-700 transition-colors text-xl">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="input-cafe w-full" placeholder="Juan" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Apellidos *</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)}
                className="input-cafe w-full" placeholder="García López" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Edad</label>
              <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)}
                className="input-cafe w-full" placeholder="25" min="18" max="80" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-600 mb-1">Rol *</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
                className="input-cafe w-full">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cafe-600 mb-1">Usuario *</label>
            <input value={form.usuario} onChange={e => set('usuario', e.target.value)}
              className="input-cafe w-full" placeholder="juan.garcia"
              disabled={!esNuevo} />
            {!esNuevo && (
              <p className="text-xs text-cafe-400 mt-1">El nombre de usuario no se puede cambiar</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-cafe-600 mb-1">
              {esNuevo ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}
            </label>
            <input type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              className="input-cafe w-full" placeholder="••••••••" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-crema-200 flex justify-end gap-3">
          <button onClick={onClose}
            className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {esNuevo ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const [lista, setLista]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [buscar, setBuscar]     = useState('')
  const [modal, setModal]       = useState(null) // null | 'nuevo' | objeto usuario
  const [toggling, setToggling] = useState(null)
  const [error, setError]       = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const res = await usuariosApi.getAll()
      if (res.ok) setLista(res.data)
      else setError(res.message)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function handleToggle(u) {
    if (u.id_usuario === 'USR-001') return
    setToggling(u.id_usuario)
    try {
      await usuariosApi.toggle(u.id_usuario, !u.activo)
      await cargar()
    } catch { setError('Error al cambiar estado') }
    finally { setToggling(null) }
  }

  const filtrados = lista.filter(u =>
    `${u.nombre} ${u.apellidos} ${u.usuario}`.toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cafe-800 dark:text-crema-100">Usuarios del sistema</h1>
          <p className="text-sm text-cafe-500 mt-0.5">
            {lista.length} usuario{lista.length !== 1 ? 's' : ''} registrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModal('nuevo')}
          className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span>
          Nuevo usuario
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400 text-sm">🔍</span>
        <input
          value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar por nombre o usuario..."
          className="input-cafe w-full pl-9 max-w-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="table-wrapper">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-cafe-400">
            <span className="w-6 h-6 border-2 border-cafe-300 border-t-cafe-600 rounded-full animate-spin mr-3" />
            Cargando usuarios...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-cafe-400">
            {buscar ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-crema-50 dark:bg-cafe-900 border-b border-crema-200 dark:border-cafe-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Rol</th>
                <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Registro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-cafe-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, i) => (
                <tr key={u.id_usuario}
                  className={`border-b border-crema-100 dark:border-cafe-700 hover:bg-crema-50/50 dark:hover:bg-cafe-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-crema-50/20 dark:bg-cafe-800/40'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cafe-100 dark:bg-cafe-700 flex items-center justify-center text-cafe-700 dark:text-crema-200 font-semibold text-sm shrink-0">
                        {u.nombre?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-mono text-sm text-cafe-700 dark:text-crema-200">{u.usuario}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-cafe-800 dark:text-crema-100">
                    {u.nombre} {u.apellidos}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${u.categoria === 'admin'
                          ? 'bg-terracota-100 text-terracota-700 dark:bg-terracota-900/40 dark:text-terracota-300'
                          : ''}`}
                      style={u.categoria !== 'admin' ? {
                        background: 'var(--status-ok-bg)',
                        color: 'var(--status-ok-fg)',
                      } : undefined}>
                      {u.categoria}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-4 text-sm text-cafe-500 dark:text-cafe-400">
                    {u.fecha_registro || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={toggling === u.id_usuario || u.id_usuario === 'USR-001'}
                      title={u.id_usuario === 'USR-001' ? 'El admin principal no puede desactivarse' : ''}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                        ${u.activo ? '' : 'bg-gray-300'}
                        ${u.id_usuario === 'USR-001' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={u.activo ? { background: 'var(--cafe-btn)', transition: 'background 0.8s ease' } : undefined}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                        ${u.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setModal(u)}
                      className="text-xs text-cafe-500 hover:text-cafe-800 font-medium hover:underline transition-colors">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalUsuario
          usuario={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}
    </div>
  )
}

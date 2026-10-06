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
        <div className="flex items-center justify-between px-6 py-4 border-b cafe-border-theme">
          <h2 className="text-lg font-semibold text-ink">
            {esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full icon-btn-muted transition-colors text-xl">
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
              <label className="block text-xs font-medium label-muted mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="input-cafe w-full" placeholder="Juan" />
            </div>
            <div>
              <label className="block text-xs font-medium label-muted mb-1">Apellidos *</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)}
                className="input-cafe w-full" placeholder="García López" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium label-muted mb-1">Edad</label>
              <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)}
                className="input-cafe w-full" placeholder="25" min="18" max="80" />
            </div>
            <div>
              <label className="block text-xs font-medium label-muted mb-1">Rol *</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
                className="input-cafe w-full">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium label-muted mb-1">Usuario *</label>
            <input value={form.usuario} onChange={e => set('usuario', e.target.value)}
              className="input-cafe w-full" placeholder="juan.garcia"
              disabled={!esNuevo} />
            {!esNuevo && (
              <p className="text-xs label-muted mt-1">El nombre de usuario no se puede cambiar</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium label-muted mb-1">
              {esNuevo ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}
            </label>
            <input type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              className="input-cafe w-full" placeholder="••••••••" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t cafe-border-theme flex justify-end gap-3">
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
          <h1 className="text-2xl font-bold text-ink">Usuarios del sistema</h1>
          <p className="text-sm label-muted mt-0.5">
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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 label-muted text-sm">🔍</span>
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
          <div className="flex items-center justify-center py-16 label-muted">
            <span className="w-6 h-6 border-2 spinner-theme rounded-full animate-spin mr-3" />
            Cargando usuarios...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 label-muted">
            {buscar ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="surface-head-row border-b cafe-border-theme">
                <th className="text-left px-5 py-3 text-xs font-semibold label-muted uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold label-muted uppercase tracking-wide">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold label-muted uppercase tracking-wide">Rol</th>
                <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold label-muted uppercase tracking-wide">Registro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold label-muted uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, i) => (
                <tr key={u.id_usuario}
                  className={`border-b cafe-border-theme surface-row-hover transition-colors ${i % 2 === 0 ? '' : 'surface-row-stripe'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full surface-soft-theme flex items-center justify-center text-ink font-semibold text-sm shrink-0">
                        {u.nombre?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-mono text-sm text-ink">{u.usuario}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink">
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
                  <td className="hidden sm:table-cell px-5 py-4 text-sm label-muted">
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
                      className="text-xs link-action-theme font-medium hover:underline transition-colors">
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

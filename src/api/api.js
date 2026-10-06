// ============================================================
// CAFÉ+ — API switcher
// Backend activo según VITE_API_BACKEND ("sheets" default | "supabase").
// Las 7 páginas importan solo de aquí — nunca directo de sheets.js/supabase.js.
// ============================================================

import * as sheetsBackend from './sheets'
import * as supabaseBackend from './supabase'

const backend = import.meta.env.VITE_API_BACKEND === 'supabase' ? supabaseBackend : sheetsBackend

export const auth = backend.auth
export const usuarios = backend.usuarios
export const productos = backend.productos
export const clientes = backend.clientes
export const pedidos = backend.pedidos
export const analytics = backend.analytics

// Helpers de formato — puros, idénticos en ambos backends.
export {
  formatMXN, formatFecha, formatFechaHora,
  canalBadge, estadoBadge, categoriaBadge, generarMeses,
} from './sheets'

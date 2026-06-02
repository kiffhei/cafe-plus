# CLAUDE.md — Café Plus | Sesión 4
> Contexto para Claude Code. Actualizado: 2026-06-02  
> Skills aplicadas: frontend-design, theme-factory (Anthropic Forge)

---

## IDENTIDAD DEL PROYECTO

**Café+** — sistema de gestión operativa para cafetería en Cuautitlán, EdoMex.  
Dev: Brian Anaya (kiffhei) | **Es portafolio público → cada pantalla debe verse premium.**

- **Repo:** https://github.com/kiffhei/cafe-plus
- **Prod:** https://clawdbot-cafe-plus.u555aa.easypanel.host
- **Backend GAS:** https://script.google.com/macros/s/AKfycbwtDGwTv2T8MiyWZOS3bXfOOWutNgFPGbZZeqaed7yHhd4OnFXuW5LYAXl27ao4QJ3w/exec
- **Spreadsheet ID:** 1GdeZReoLbIhZc9kRGK7IjhsgaNds8O26uEGQVvY1dq4
- **n8n base:** https://appn8n-n8n.u555aa.easypanel.host

---

## ESTADO DE MÓDULOS

| Archivo | Estado | Deploy |
|---------|--------|--------|
| Login.jsx | ✅ Completo | ✅ prod |
| Layout.jsx | ✅ Sidebar + ThemeToggle | ✅ prod |
| ThemeContext.jsx | ✅ | ✅ prod |
| **App.jsx** | ✅ — **BLOQUEADO, NO TOCAR** | ✅ prod |
| **Sidebar.jsx** | ✅ — **BLOQUEADO, NO TOCAR** | ✅ prod |
| Usuarios.jsx | ✅ CRUD completo | ✅ prod |
| Productos.jsx | ✅ CRUD + toggle | ✅ prod |
| Clientes.jsx | ✅ CRUD + badges | ✅ prod |
| NuevoPedido.jsx | ✅ Carrito + descuentos | ✅ prod |
| PedidosHoy.jsx | ✅ Kanban + autorefresh | ✅ prod |
| **Historial.jsx** | ❌ PENDIENTE | — |
| **Analisis.jsx** | ❌ PENDIENTE | — |

---

## TAREAS DE ESTA SESIÓN (orden de ejecución)

1. **TAREA 1 — Mejora Visual + Mobile Responsive** (afecta Layout, index.css y todos los JSX)
2. **TAREA 2 — Historial.jsx** (tabla paginada + PDF jsPDF)
3. **TAREA 3 — Analisis.jsx** (KPIs + recharts + chat n8n)
4. **TAREA 4 — Auth con Clerk** (evaluar e implementar en rama separada)

---

## TAREA 1 — MEJORA VISUAL Y RESPONSIVE

### Identidad estética objetivo
Dirección: **"cafetería artesanal premium"** — cálida, orgánica, refinada.
No genérico. Que evoque un menú de café de especialidad: materiales reales,
tipografía con carácter, detalles sutiles pero presentes.
El diseño actual tiene buen color pero falta profundidad, glassmorphism y respiración.

### Cambios en index.css — agregar al @layer components existente

```css
/* Glassmorphism para modales y cards de dashboard */
.glass-card {
  @apply bg-white/80 dark:bg-cafe-800/80 backdrop-blur-sm
         border border-white/40 dark:border-cafe-700/40
         shadow-warm rounded-2xl;
}

/* Scroll horizontal seguro en mobile (envolver tablas con esto) */
.table-wrapper {
  @apply w-full overflow-x-auto rounded-2xl border border-crema-200
         dark:border-cafe-700 shadow-sm;
}

/* KPI card para dashboard */
.kpi-card {
  @apply glass-card p-5 flex flex-col gap-1 transition-all duration-200
         hover:shadow-warm-lg hover:-translate-y-0.5;
}

/* Separador decorativo con degradado */
.divider-cafe {
  @apply h-px bg-gradient-to-r from-transparent via-cafe-200 to-transparent
         dark:via-cafe-700 my-4;
}
```

### Reglas mobile a aplicar en TODOS los componentes

**Tablas:** envolver en `<div className="table-wrapper">`. Ocultar columnas secundarias:
```jsx
<th className="hidden sm:table-cell">Cajero</th>
<td className="hidden sm:table-cell">{...}</td>
```

**Modales:** ya tienen `max-h-[90vh] overflow-y-auto` en algunos, verificar todos. En mobile:
```jsx
className="w-full sm:max-w-md"  // no max-w fijo sin sm: prefix
```

**NuevoPedido — layout de dos paneles:**
```jsx
// ANTES: <div className="flex gap-6">
// DESPUÉS:
<div className="flex flex-col lg:flex-row gap-6">
  {/* catálogo — full width en mobile */}
  <div className="flex-1 min-w-0"> ... </div>
  {/* resumen — full width en mobile, 320px en desktop */}
  <div className="w-full lg:w-80 shrink-0"> ... </div>
</div>
```

**Header en mobile:**
```jsx
// Ocultar nombre/rol en mobile, solo mostrar avatar
<div className="hidden sm:block text-right"> ... nombre y rol ... </div>
// Avatar siempre visible
```

### Sidebar mobile — especificación técnica para Layout.jsx

Layout.jsx SÍ se puede modificar (no está bloqueado). Agregar estado `mobileOpen`:

```jsx
const [mobileOpen, setMobileOpen] = useState(false)

// En el JSX, antes del Sidebar:
{mobileOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
    onClick={() => setMobileOpen(false)}
  />
)}

// Pasar props al Sidebar:
<Sidebar
  collapsed={collapsed}
  onToggle={() => setCollapsed(c => !c)}
  mobileOpen={mobileOpen}
  onMobileClose={() => setMobileOpen(false)}
/>

// Botón hamburguesa en el header (solo mobile):
<button
  className="lg:hidden mr-3 p-2 rounded-lg text-cafe-600 dark:text-cafe-300
             hover:bg-crema-100 dark:hover:bg-cafe-700 transition-colors"
  onClick={() => setMobileOpen(true)}
  aria-label="Abrir menú"
>
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
</button>
```

En Sidebar.jsx agregar soporte para las nuevas props (sin tocar rutas ni nav items):
```jsx
// Recibir nuevas props:
export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {

// Clases del contenedor principal del sidebar:
className={`
  fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
  flex flex-col h-full
  bg-cafe-900 dark:bg-cafe-950
  transition-all duration-300 ease-in-out
  ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  ${collapsed ? 'w-16' : 'w-64'}
`}

// Botón cerrar visible solo en mobile:
<button
  className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg
             text-cafe-400 hover:text-crema-200 hover:bg-cafe-700"
  onClick={onMobileClose}
>
  ×
</button>
```

---

## TAREA 2 — HISTORIAL.JSX

**Ruta:** `src/pages/Historial.jsx`
**Acceso:** Admin ve todo; cajero filtra automáticamente por `user.id_usuario`.

### Imports requeridos
```js
import { pedidos as pedidosApi, formatMXN, formatFecha, canalBadge, estadoBadge } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { jsPDF } from 'jspdf'
// Instalar si no está: npm install jspdf
```

### Funcionalidades
- `<div className="table-wrapper">` envolviendo la tabla para mobile
- Columnas: #, Fecha, Cajero, Cliente, Canal (badge), Productos (resumen "N items"),
  Descuento, Total, Estado (badge), Acciones
- Columnas secundarias ocultas en mobile: `hidden sm:table-cell`
- Filtros: fecha_desde, fecha_hasta, cajero (select), canal (select), estado (select)
- Paginación: 10 por página, client-side sobre los datos del fetch
- Botón "Ver detalle" → modal con tabla completa de productos del pedido
- Botón "Ticket PDF" → genera PDF con jsPDF

### Ticket PDF — estructura jsPDF
```js
function generarTicketPDF(pedido) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 160] }) // ticket 80mm
  const cafe = '#8B4513'
  const gris = '#555555'

  doc.setFontSize(18)
  doc.setTextColor(cafe)
  doc.text('☕ CAFÉ+', 40, 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(gris)
  doc.text('─'.repeat(38), 5, 16)

  doc.setFontSize(9)
  doc.text(`Ticket: ${pedido.id_pedido}`, 5, 21)
  doc.text(`Fecha: ${formatFecha(pedido.fecha_hora)}`, 5, 26)
  doc.text(`Cajero: ${pedido.nombre_cajero}`, 5, 31)
  doc.text(`Canal: ${pedido.canal}`, 5, 36)
  doc.text(`Cliente: ${pedido.nombre_cliente || 'Público general'}`, 5, 41)
  doc.text('─'.repeat(38), 5, 45)

  // items
  let y = 50
  const items = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : pedido.items || []
  items.forEach(item => {
    doc.text(`${item.cantidad}x ${item.nombre_producto}`, 5, y)
    doc.text(formatMXN(item.precio_unitario * item.cantidad), 75, y, { align: 'right' })
    y += 5
  })

  doc.text('─'.repeat(38), 5, y); y += 5
  doc.text(`Subtotal: ${formatMXN(pedido.subtotal)}`, 5, y); y += 5
  if (pedido.descuento > 0) {
    doc.setTextColor('#6B7C3D')
    doc.text(`Descuento: -${formatMXN(pedido.descuento)}`, 5, y); y += 5
    doc.setTextColor(gris)
  }
  doc.setFontSize(11)
  doc.setTextColor(cafe)
  doc.text(`TOTAL: ${formatMXN(pedido.total)}`, 5, y); y += 8

  doc.setFontSize(8)
  doc.setTextColor(gris)
  doc.text('¡Gracias por tu visita!', 40, y, { align: 'center' }); y += 4
  doc.text('Café+ · Cuautitlán, EdoMex', 40, y, { align: 'center' })

  doc.save(`ticket-${pedido.id_pedido}.pdf`)
}
```

### Endpoint API
```js
pedidos.getAll({ fecha_desde, fecha_hasta, id_cajero, canal, estado })
// Retorna: { ok, data: [...], total }
```

---

## TAREA 3 — ANALISIS.JSX

**Ruta:** `src/pages/Analisis.jsx`
**Acceso:** Admin y cajero.

### Imports requeridos
```js
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
// Instalar si no está: npm install recharts
import { formatMXN, formatFecha } from '../api/api'
import { useAuth } from '../context/AuthContext'
```

### Colores para gráficas (consistentes con la paleta del proyecto)
```js
const CHART_COLORS = ['#8B4513', '#C1440E', '#6B7C3D', '#d4a96a', '#3b82f6']
```

### Sección A — KPIs
Cards con clase `.kpi-card`. Datos desde `getAnalytics`:
- 💰 Total ventas | 🧾 Ticket promedio | 📦 Total pedidos | 🏆 Canal top | ⭐ Producto top

### Sección B — Gráficas (recharts)
- `BarChart` + `ResponsiveContainer`: ventas por día
- `PieChart`: distribución % por canal
- `LineChart` con `type="monotone"`: tendencia ventas

### Selector de periodo
```jsx
const [periodo, setPeriodo] = useState('semana') // 'semana' | 'mes' | 'custom'
const [fechaDesde, setFechaDesde] = useState('')
const [fechaHasta, setFechaHasta] = useState('')
```

### Sección C — Chat IA
```js
// POST al webhook n8n (mismo patrón CORS que GAS — sin headers)
const res = await fetch(import.meta.env.VITE_N8N_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({
    mensaje: inputTexto,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    usuario: user.nombre,
    contexto: 'analisis_ventas'
  })
})
const data = await res.json()
// El agente responde: { respuesta: "texto en español MXN" }
```

**UI del chat:**
- Array de mensajes `[{ role: 'user'|'agent', texto, ts }]` en `useState`
- Indicador "escribiendo..." con 3 puntos animados CSS mientras espera
- Auto-scroll al último mensaje con `useRef` + `scrollIntoView`
- 4 chips de pregunta rápida clicables para facilitar uso mobile

---

## TAREA 4 — AUTH CON CLERK

### ¿Qué aporta Clerk al portafolio?
- 2FA real (email OTP o TOTP con Google Authenticator)
- JWT industry-standard en lugar de token manual en localStorage
- Dashboard de usuarios en clerk.com
- Mucho más impresionante en un portafolio que SHA256 en Sheets

### Instalación
```bash
npm install @clerk/clerk-react
# Compatible con React 18+ (verificado: ^5.61.3)
```

### Variable de entorno
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxx
# Obtener en: clerk.com → Dashboard → API Keys
```

### main.jsx actualizado
```jsx
import { ClerkProvider } from '@clerk/clerk-react'
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
)
```

### Appearance — mantener paleta café
```js
// src/lib/clerkTheme.js
export const clerkTheme = {
  variables: {
    colorPrimary:        '#8B4513',
    colorBackground:     '#fdf8f3',
    colorText:           '#2c1810',
    colorInputBackground:'#ffffff',
    colorInputText:      '#2c1810',
    borderRadius:        '0.5rem',
    fontFamily:          '"DM Sans", system-ui, sans-serif',
  }
}
```

### Estrategia de integración (sin romper backend GAS)
Clerk maneja sesión + 2FA. GAS sigue siendo la BD de datos.
El `AuthContext.jsx` se adapta para leer `useUser()` de Clerk en lugar de localStorage.

```jsx
// AuthContext.jsx actualizado
import { useUser } from '@clerk/clerk-react'

export function AuthProvider({ children }) {
  const { user, isLoaded } = useUser()
  // user.publicMetadata.categoria === 'admin' | 'cajero'
  // Setear categoría desde el dashboard de Clerk en publicMetadata
  ...
}
```

### Alternativa si no quieres SaaS: 2FA con n8n
Si se prefiere sin dependencias externas:
1. GAS genera código 6 dígitos con TTL 10 min en una hoja temporal
2. GAS llama webhook n8n → n8n envía email con código vía Gmail
3. Frontend muestra pantalla "Ingresa el código"
4. GAS valida código → emite token de sesión

**Recomendación para esta sesión:** implementar Clerk en rama `feat/clerk-auth`.
Si el cliente no quiere la dependencia, usar `main` con el sistema actual.

---

## CONVENCIONES OBLIGATORIAS (no romper en ningún caso)

### Naming crítico — errores de sesiones anteriores
```js
formatFecha(str)       // ✅ existe en api.js
formatFechaHora(str)   // ❌ NO EXISTE → rompe el build

className="input-cafe"   // ✅
className="input-field"  // ✅ alias
className="input-cafeteria" // ❌ NO EXISTE
```

### Imports api.js
```js
import { usuarios, productos, clientes, pedidos } from '../api/api'
import { formatMXN, formatFecha, canalBadge, estadoBadge } from '../api/api'
```

### Dark mode — aplicar en todos los elementos
```jsx
className="bg-white dark:bg-cafe-800 text-cafe-800 dark:text-crema-100 border-cafe-100 dark:border-cafe-700"
```

### CORS — Apps Script y n8n
```js
// ✅ fetch nativo SIN headers — tanto para GAS como para n8n
fetch(URL, { method: 'POST', body: JSON.stringify(data) })
// ❌ Nunca axios, nunca Content-Type header explícito
```

---

## WORKFLOW DE DEPLOY

```bash
cd ~/Documents/proyectos/cafe-plus

# Copiar archivos nuevos o modificados
cp ~/Downloads/Historial.jsx   src/pages/
cp ~/Downloads/Analisis.jsx    src/pages/
cp ~/Downloads/Layout.jsx      src/components/    # si se modificó
cp ~/Downloads/index.css       src/               # si se modificó

# OBLIGATORIO antes de cualquier push
npm run build

# Si el build pasa limpio:
git add -A
git commit -m "feat: Historial + Analisis + responsive + visual improvements"
git push
# EasyPanel autodespliega en ~5-18 segundos
```

---

## INCIDENCIAS CONOCIDAS — NO REPETIR

| # | Regla |
|---|-------|
| INC-001 | Solo `fetch` nativo sin headers en POST a GAS o n8n |
| INC-002 | `npm run build` antes de CADA push — Rollup es estricto |
| INC-003 | EasyPanel sin actualizar → `git commit --allow-empty -m "chore: force redeploy"` |
| INC-005 | Verificar autodeploy activo antes de iniciar trabajo |
| — | `formatFechaHora` no existe → usar `formatFecha` |
| — | `App.jsx` y `Sidebar.jsx` bloqueados → no tocar rutas ni nav items |

---

## CREDENCIALES DE PRUEBA

```
Admin:  admin    / admin123
Cajero: cajero1  / cajero123
```

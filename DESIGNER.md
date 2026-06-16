# DESIGNER.md — Café+ | Guía Visual

Referencia de identidad visual para el proyecto. Actualizado: 2026-06-15 (S8 — 7 temas, EXACT_MATCH, modal-surface, gradientes recharts).

---

## Identidad visual — "Fresh Matcha"

Estética: glassmorphism + verde matcha + tipografía premium. Portafolio público — cada pantalla debe verse premium.

---

## Paleta Tailwind activa

```js
cafe-500:      '#2d6a4f'   // verde primario — botones, acentos, links
cafe-800:      '#0d2d1f'   // verde oscuro — dark mode surfaces
terracota-500: '#1e6091'   // azul acento — KPIs secundarios, badges
olivo-500:     '#40916c'   // verde positivo — estados OK, badges activo
crema-bg:      '#f8fffe'   // fondo light
dark-bg:       '#0d1b2a'   // fondo dark

// recharts — SIEMPRE estos colores, en este orden
CHART_COLORS = ['#2d6a4f', '#1e6091', '#40916c', '#48cae4', '#84cba8']

// Canales delivery (Treemap y leyendas)
Local:     #2d6a4f
Rappi:     #1e6091
Uber Eats: #40916c
DiDi Food: #48cae4
```

**Regla:** No cambiar tokens sin instrucción explícita. Están definidos en `tailwind.config.js`.

---

## Tipografía

| Rol | Fuente | Uso |
|-----|--------|-----|
| Display | Plus Jakarta Sans | h1–h4, títulos de módulo, logo |
| Body | Outfit | Texto general, labels, botones, subtítulos |
| Mono | JetBrains Mono | IDs, códigos, valores numéricos en tablas |

Cargadas desde Google Fonts en `index.html`. Configuradas como `fontFamily` en `tailwind.config.js`.

---

## Componentes y clases CSS activas

### Inputs
```jsx
className="input-cafe"    // input estándar — borde cafe, focus ring verde
className="input-field"   // alias de input-cafe
// NO existe: input-cafeteria
```

### Botones
```jsx
className="btn-primary"   // fondo cafe-500, texto blanco, hover cafe-600
className="btn-secondary" // borde cafe-200, texto cafe-700, hover crema
```

### Cards y superficies
```jsx
className="kpi-card"      // glassmorphism — backdrop-blur + bg semi-transparente + sombra
className="table-wrapper" // contenedor tabla con scroll horizontal + bordes redondeados
```

### Header
```jsx
className="header-glass"  // sticky header translúcido con backdrop-blur
```

### Badges de estado y canal
```js
// Importar desde api.js:
import { canalBadge, estadoBadge } from '../api/api'

canalBadge('local')     // → { label: 'Local',     cls: 'badge-canal-local' }
estadoBadge('entregado') // → { label: 'Entregado', cls: 'badge-estado-entregado' }
```

### Animaciones
```css
/* Definidas en index.css */
.stagger-item          /* aparición escalonada en listas */
.animate-fade-in       /* fade in suave */
.animate-slide-up      /* slide desde abajo */
```

---

## Dark mode

Tailwind `darkMode: 'class'` — la clase `dark` se aplica en `<html>` via `ThemeContext.jsx`.

**Regla obligatoria:** todos los elementos nuevos deben tener variante dark:

```jsx
// Patrón estándar
className="bg-white dark:bg-cafe-800 text-cafe-800 dark:text-crema-100 border-cafe-100 dark:border-cafe-700"

// Superficie elevada
className="bg-crema-50 dark:bg-cafe-900"

// Texto secundario
className="text-cafe-500 dark:text-cafe-400"
```

---

## Clerk theme

Archivo: `src/lib/clerkTheme.js`

Paleta Fresh Matcha aplicada al componente `<SignIn>` de Clerk:

```js
variables: {
  colorPrimary:    '#2d6a4f',   // cafe-500
  colorBackground: '#f8fffe',   // crema-bg
  borderRadius:    '0.75rem',
  fontFamily:      '"Outfit", system-ui, sans-serif',
}
```

La pantalla de login (`Login.jsx`) usa gradiente `crema-bg → olivo` en light y `dark-bg → cafe-800` en dark.

---

## recharts — reglas de uso

```jsx
// CORRECTO — props primitivos siempre
<Tooltip
  formatter={(value) => [formatMXN(value), 'Ventas']}
  contentStyle={{ backgroundColor: '#0d2d1f', borderRadius: '8px' }}
  labelStyle={{ color: '#d4a96a' }}
/>

// INCORRECTO — rompe en producción con Vite 8 rolldown
<Tooltip content={<MiComponenteTooltip />} />

// Treemap customContent: función que retorna SVG primitivo
// NO usar componentes React como contentRenderer
```

Versión fija: `recharts@2.15.3` — no actualizar a v3.

---

## Componentes nuevos de S8

### ShaderBackground.jsx — fondo WebGL (`src/components/ui/`)
Reemplaza los orbes CSS anteriores. Canvas WebGL con `requestAnimationFrame`, montado en `Layout.jsx:61`.
- Contexto WebGL creado **una sola vez** (`useEffect([])`) — recrearlo en cada render mata el rendimiento.
- Los colores del shader vienen de `colorsRef` (no de deps del effect) → cambio de tema/darkMode sin remount.
- `position: fixed; z-index: 0; pointer-events: none`.
- **Trade-off conocido:** WebGL corre en todas las pantallas. En equipos viejos puede consumir GPU; si se reporta, fallback a orbes CSS.

### AISidebar.jsx — chat IA flotante (`src/components/`)
Panel lateral colapsable con el chat del agente IA (n8n + OpenAI). Usado en Análisis e Historial.
- Detecta contexto por ruta: `/historial` → `historial_pedidos`, resto → `analisis_ventas`.
- POST a `VITE_N8N_WEBHOOK` con `fetch` nativo (sin headers — evita preflight CORS).
- Lee respuesta con fallback en cadena: `data?.respuesta ?? data?.output ?? data?.text`.
- JSON no parseable → mensaje de fallback (catch documentado, no silencioso).

## Imágenes de producto — EXACT_MATCH (S8)

Archivo: `src/lib/productImages.js`

**Arquitectura EXACT_MATCH:** nombre normalizado (sin acentos, minúsculas) como key lookup O(1). Prioridad absoluta sobre keyword map.

```js
import { getProductImage } from '../lib/productImages'

// En card de producto:
<img src={getProductImage(producto.nombre, producto.categoria, 400)} alt={producto.nombre} />
```

- 18 productos del catálogo con foto exacta asignada
- `keywordMatch()` como fallback para productos no listados
- `CATEGORY_FALLBACK` como último recurso por categoría normalizada
- Para agregar nuevo producto: una línea en `EXACT_MATCH` con `norm(nombre): 'photo-id-unsplash'`

## recharts — gradientes S8

Patrón para BarChart con gradientes verticales temáticos:

```jsx
<BarChart data={...}>
  <defs>
    <linearGradient id={`barHigh${tema}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stopColor={chartBtn}    stopOpacity={1} />
      <stop offset="100%" stopColor={chartAccent} stopOpacity={0.75} />
    </linearGradient>
  </defs>
  <Bar ...>
    {data.map((entry, i) => (
      <Cell key={i} fill={`url(#barHigh${tema})`} />
    ))}
  </Bar>
</BarChart>
```

- IDs sufijados con `${tema}` evitan colisiones entre renders
- `chartAccent` / `chartBtn` vienen de tablas estáticas `TEMA_CHART_PRIMARY[tema]` — no `getComputedStyle`

## Pendientes visuales — próxima fase

- Light mode QA en los 7 temas — puede haber conflictos de contraste pendientes
- Skeleton loaders en lugar de spinners de carga
- Empty states ilustrados por módulo (0 productos, 0 clientes, etc.)
- Badges de categoría dinámicos (actualmente hardcodeados en verde)

---

## SISTEMA DE TEMAS — REGLAS

7 paletas dinámicas (`matcha`, `cafe-oscuro`, `medianoche`, `terracota`, `pizarra`, `vinyl-dark`, `vinyl-light`) controladas por `data-theme` en `<html>` via `ThemeContext.jsx`. Las variables CSS se definen en `[data-theme="X"]` en `index.css`.

### Clases de superficie S8 (nuevas — usar en lugar de dark:bg-cafe-800)

```css
.modal-surface   /* dark: var(--cafe-sb-bg) + blur / light: rgba(255,255,255,0.96) */
.label-muted     /* dark: rgba(255,255,255,0.45) / light: rgba(0,0,0,0.45) — etiquetas secundarias */
```

Estas clases son las únicas que garantizan contraste correcto en los 7 temas.

| Elemento | Clase/style correcto | NUNCA usar |
|----------|---------------------|------------|
| Botones primarios | `btn-primary` → `var(--cafe-btn)` | `bg-cafe-500` hardcodeado |
| Valores KPI destacados | `text-accent-theme` → `var(--cafe-accent)` | `text-terracota-500` hardcodeado |
| Tabs / filtros activos | `tab-active-theme` → `var(--cafe-btn)` | `bg-cafe-700` hardcodeado |
| Encabezado de tabla (thead) | `rgba(255,255,255,0.08)` fondo + `color: var(--cafe-accent)` texto | `var(--cafe-btn)` como fondo — rompe contraste en tema terracota |
| Sidebar y header | `.cafe-sidebar-surface` | `bg-cafe-800` hardcodeado |
| Área central de contenido | `.cafe-main-surface` | `bg-cafe-800` hardcodeado |
| Fondo animado | `ShaderBackground.jsx` — canvas WebGL montado en Layout.jsx:61 (los colores reaccionan al tema vía `colorsRef`) | recrear el contexto WebGL en cada cambio de tema (usar el ref) |
| Toggles activos | `style={{ background: 'var(--cafe-btn)', transition: 'background 0.8s ease' }}` | `bg-olivo-500` hardcodeado |
| Colores de gráficas (recharts) | `TEMA_CHART_PRIMARY[tema]` / `TEMA_CHART_BTN[tema]` (tablas estáticas) | `getComputedStyle` — timing issue vs `useEffect` |

**Transición:** todos los elementos temáticos usan `transition: background 0.8s ease` para animación suave al cambiar de paleta.

---

## Reglas que nunca romper

| Regla | Razón |
|-------|-------|
| `recharts@2.15.3` — no actualizar | v3 incompatible con Vite 8 rolldown |
| `className="input-cafe"` — no `input-cafeteria` | La clase `input-cafeteria` no existe |
| `formatFecha(str)` — no `formatFechaHora` | `formatFechaHora` no existe en api.js — build error |
| Dark mode en todos los elementos nuevos | Modo oscuro es feature de primera clase |
| No componentes React como `content` en recharts | Rompe en producción silenciosamente |
| `tab-active-theme` / `text-accent-theme` — no colores Tailwind fijos | El sistema de temas requiere CSS custom properties en runtime |

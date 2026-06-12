# DESIGNER.md — Café+ | Guía Visual

Referencia de identidad visual para el proyecto. Actualizado: 2026-06-12.

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

## Pendientes visuales — próxima fase

- Fotos de productos en cards de Productos y NuevoPedido
- Theme switcher (selector de paleta de colores)
- Microanimaciones y transiciones entre pantallas (React Router transitions)
- Perfilamiento visual general más profesional (spacing audit, jerarquía tipográfica)
- Skeleton loaders en lugar de spinners
- Empty states ilustrados por módulo

---

## Reglas que nunca romper

| Regla | Razón |
|-------|-------|
| `recharts@2.15.3` — no actualizar | v3 incompatible con Vite 8 rolldown |
| `className="input-cafe"` — no `input-cafeteria` | La clase `input-cafeteria` no existe |
| `formatFecha(str)` — no `formatFechaHora` | `formatFechaHora` no existe en api.js — build error |
| Dark mode en todos los elementos nuevos | Modo oscuro es feature de primera clase |
| No componentes React como `content` en recharts | Rompe en producción silenciosamente |

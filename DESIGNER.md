# DESIGNER.md — Café+ Visual Design System

> Reference for UI contributors and AI design assistants.
> Covers: identity, palette, typography, theme system, component classes, and rules.

---

## Visual identity — "Fresh Matcha"

Aesthetic: **glassmorphism + matcha green + premium typography**.
Every screen is treated as a portfolio piece — high contrast, intentional whitespace, cohesive color.

---

## Color palette

Defined as Tailwind tokens in `tailwind.config.js`:

```js
cafe-500:      '#2d6a4f'   // primary green — buttons, active states, accents
cafe-800:      '#0d2d1f'   // dark green — dark mode surfaces
terracota-500: '#1e6091'   // blue accent — secondary KPIs, highlights
olivo-500:     '#40916c'   // positive green — success states, badges
crema-bg:      '#f8fffe'   // light background
dark-bg:       '#0d1b2a'   // dark background
```

> Only the shades defined in `tailwind.config.js` exist.
> For subtle tints use `color-500/10` — never assume `-50` or `-100` shades.

### Chart colors (always use these, in order)

```js
CHART_COLORS = ['#2d6a4f', '#1e6091', '#40916c', '#48cae4', '#84cba8']

// Delivery channel colors (Treemap and legends)
Local:     '#2d6a4f'
Rappi:     '#1e6091'
Uber Eats: '#40916c'
DiDi Food: '#48cae4'
```

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display | Plus Jakarta Sans | h1–h4, module titles, logo |
| Body | Outfit | Labels, body text, buttons |
| Mono | JetBrains Mono | IDs, codes, numeric values in tables |

Loaded from Google Fonts in `index.html`. Registered in `tailwind.config.js` as `fontFamily`.

---

## Theme system

7 dynamic color themes. Active theme is set via `data-theme` attribute on `<html>`.
`ThemeContext.jsx` manages theme state and persists to `localStorage`.

| Theme ID | Name | Mode |
|----------|------|------|
| `matcha` | Fresh Matcha | dark |
| `cafe-oscuro` | Café Oscuro | dark |
| `medianoche` | Medianoche | dark |
| `terracota` | Terracota | dark |
| `pizarra` | Pizarra | dark |
| `vinyl-dark` | Vinyl Dark | dark |
| `vinyl-light` | Record Shop | **light** |

Only `vinyl-light` supports light mode. `darkMode` is derived from the active theme:

```js
const LIGHT_THEMES = new Set(['vinyl-light'])
const darkMode = !LIGHT_THEMES.has(tema)
```

### CSS custom properties (defined per theme in `index.css`)

| Variable | Purpose |
|----------|---------|
| `--cafe-accent` | Accent color — active icons, highlighted text on dark surfaces |
| `--cafe-accent-ink` | Accent for text on **light** surfaces (meets WCAG AA ≥4.5:1) |
| `--cafe-btn` | Primary button background, active tabs, ON toggles |
| `--cafe-sb-bg` | Sidebar background (glassmorphism + backdrop-blur) |
| `--cafe-main-bg` | Main content area background |
| `--cafe-border` | Surface and card borders |
| `--cafe-kpi-val` | Numeric KPI values |
| `--cafe-bg-base` | Page base color (canvas background) |
| `--status-*-bg/fg` | Semantic status colors (pendiente / preparacion / entregado / cancelado) |

---

## Component classes

### Surfaces

```jsx
// Theme-aware modal / card / panel background — use instead of bg-white dark:bg-cafe-800
<div className="modal-surface rounded-xl">

// Sidebar glassmorphism
<nav className="cafe-sidebar-surface">

// Main content area
<main className="cafe-main-surface">
```

> `modal-surface` resolves both background and border — do not add extra `border-*`.

CSS reference:
```css
.modal-surface {
  background: var(--cafe-sb-bg) !important;   /* dark: active theme surface */
  border: 1px solid var(--cafe-border);
}
html:not(.dark) .modal-surface {
  background: rgba(255,255,255,0.96) !important;
  border-color: rgba(0,0,0,0.08);
}
```

### Inputs

```jsx
className="input-cafe"    // standard input — green border, focus ring
className="input-field"   // alias for input-cafe
// ❌ input-cafeteria does NOT exist
```

### Buttons

```jsx
className="btn-primary"    // var(--cafe-btn) background, white text
className="btn-secondary"  // border cafe-200, cafe-700 text
```

### KPI cards

```jsx
className="kpi-card"   // glassmorphism: backdrop-blur + semi-transparent bg + border
```

For KPI cards with semantic state (e.g. pending orders), use inline `bgStyle`/`colorStyle`:

```js
// Correct — works across all 7 themes and both modes
{ colorStyle: { color: 'var(--status-prep-fg)' },
  bgStyle:    { background: 'var(--status-prep-bg)', borderColor: 'var(--status-prep-fg)' } }
```

### Text accents

```jsx
// Accent text on DARK surface (sidebar, AI panel)
className="cafe-accent-text"    // → var(--cafe-accent)

// Accent text on LIGHT surface (card values, KPI numbers)
className="text-accent-theme"   // → var(--cafe-accent-ink, var(--cafe-accent))
```

### Tabs and active filters

```jsx
className="tab-active-theme"   // → var(--cafe-btn) background + white text
```

### Badges

```js
import { canalBadge, estadoBadge, categoriaBadge } from '../api/api'

canalBadge('local')         // → { label: 'Local',     cls: 'badge-canal-local' }
estadoBadge('entregado')    // → { label: 'Entregado', cls: 'badge-estado-entregado' }
categoriaBadge('bebida')    // → { label: 'Bebida',    cls: 'badge-cat-bebidas' }
```

Badge CSS classes follow the pattern `badge-{type}-{value}`, defined in `index.css`.

### Table headers

```css
/* thead background */
background: rgba(255,255,255,0.08);

/* thead text — use ink variant for AA on light surfaces */
color: var(--cafe-accent-ink, var(--cafe-accent));
```

### Animated background

`ShaderBackground.jsx` — WebGL canvas mounted in `Layout.jsx`.
- WebGL context created **once** (`useEffect([])`). Never recreate on theme change.
- Colors update via `colorsRef` without remounting the canvas.
- `position: fixed; z-index: 0; pointer-events: none`.

---

## recharts patterns

```jsx
// Tooltip — define INSIDE the component using darkMode from useTheme()
const TOOLTIP_STYLE = {
  backgroundColor: darkMode ? 'var(--cafe-sb-bg)' : 'rgba(12,12,12,0.88)',
  border: '1px solid var(--cafe-border)',
  borderRadius: '8px',
  color: '#f0ece8',
  fontSize: '12px',
}

// ✅ Correct — primitive props only
<Tooltip formatter={(v) => [formatMXN(v), 'Ventas']} contentStyle={TOOLTIP_STYLE} />

// ❌ Wrong — React component as content breaks with Vite 8 rolldown
<Tooltip content={<MyTooltip />} />
```

Bar chart gradients — suffix IDs with `${tema}` to avoid collisions:

```jsx
<BarChart data={data}>
  <defs>
    <linearGradient id={`barGrad${tema}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stopColor={chartPrimary} stopOpacity={1} />
      <stop offset="100%" stopColor={chartAccent}  stopOpacity={0.75} />
    </linearGradient>
  </defs>
  <Bar dataKey="value">
    {data.map((_, i) => <Cell key={i} fill={`url(#barGrad${tema})`} />)}
  </Bar>
</BarChart>
```

Use `TEMA_CHART_PRIMARY[tema]` static tables for chart colors — never `getComputedStyle` (timing issue with `useEffect`).

---

## WCAG AA — light mode rule

`--cafe-accent` is tuned for dark surfaces. On light surfaces it may fail contrast.

- Text on **dark surface** (sidebar, AI panel) → `var(--cafe-accent)` (bright)
- Text on **light surface** (card values, table cells) → `var(--cafe-accent-ink, var(--cafe-accent))`

Override pattern in `index.css` (only affects light mode, no dark mode regression):

```css
html:not(.dark)[data-theme="pizarra"] {
  --cafe-accent-ink: #57800f;   /* darkened accent, ≥4.5:1 on white */
  --status-prep-fg:  #126bc3;
}
```

Never darken `--cafe-accent` globally — it would break the dark chrome.

---

## Rules — never break

| Rule | Reason |
|------|--------|
| Use `modal-surface` for modal/card/panel backgrounds | `dark:bg-cafe-800` is static and ignores the active theme |
| Use `var(--cafe-*)` CSS vars, not Tailwind color classes | Tailwind classes are static — they don't react to runtime theme changes |
| Use `text-accent-theme` / `tab-active-theme` for themed text/tabs | Hard-coded Tailwind colors ignore the current palette |
| Define `TOOLTIP_STYLE` inside the component with `darkMode` | A module-level constant with fixed colors won't react to theme or mode changes |
| KPI semantic state → `bgStyle`/`colorStyle` inline | Static Tailwind classes can't combine dark mode + 7 themes |
| `recharts@2.15.3` — do not upgrade | v3 ESM exports are tree-shaken by rolldown → runtime TypeError in production |
| New GAS deployment → new URL → update `VITE_API_URL` | The editor URL ≠ the web app URL |
| `formatFecha(str)` — not `formatFechaHora` | `formatFechaHora` does not exist; build passes but runtime errors occur |
| `input-cafe` — not `input-cafeteria` | `input-cafeteria` class does not exist |
| Native `fetch` only to GAS (no axios, no explicit `Content-Type`) | Explicit headers trigger CORS preflight — GAS rejects it |
| Verify custom shade exists in `tailwind.config.js` before using | Classes like `bg-cafe-50` silently produce transparent backgrounds |
| All theme color changes → `transition: background 0.8s ease` | Smooth palette swap animation |

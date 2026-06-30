# CLAUDE.md — Café+

> Project context for AI assistants (Claude Code, Cursor, Copilot, etc.).
> Covers: stack, architecture, conventions, and deployment workflow.

---

## Project identity

**Café+** — operational management system + CRM with integrated AI for a coffee shop.
Built as a public portfolio project by Brian Anaya ([@kiffhei](https://github.com/kiffhei)).

| Resource | URL |
|----------|-----|
| Production | https://clawdbot-cafe-plus.u555aa.easypanel.host |
| Repository | https://github.com/kiffhei/cafe-plus |

---

## Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19.2 + Vite 8 + Tailwind CSS v3 | react-router-dom v7 |
| Styling | CSS custom properties + 7 dynamic themes | See DESIGNER.md |
| Backend | Google Apps Script (REST API) | Native `fetch` only — no axios |
| Database | Google Sheets (5 sheets) | See schema below |
| Auth | Clerk | `useUser` + `publicMetadata.categoria` |
| AI | n8n + OpenAI via MCP | Webhook chat endpoint |
| PDF | jsPDF | |
| Charts | recharts@2.15.3 | v3 incompatible with Vite 8/rolldown |
| Deploy | Docker multistage on EasyPanel | Auto-deploy on push to `main` |

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Google Apps Script web app URL (each new deployment gets a new URL) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (clerk.com → API Keys) |
| `VITE_N8N_WEBHOOK` | n8n webhook URL for the AI chat |
| `VITE_GAS_API_KEY` | Shared secret between frontend and GAS — must match exactly in `Codigo.gs` |

> **Note:** all `VITE_*` variables must also be declared as `ARG`/`ENV` in `Dockerfile`
> before `RUN npm run build`. Vite only injects them at build time.

---

## Google Sheets schema

| Sheet | Key columns |
|-------|-------------|
| `bd_usuarios` | id_usuario, nombre, apellidos, categoria (admin/cajero), usuario, activo |
| `bd_productos` | id_producto, nombre, categoria, precio_venta, costo, cantidad_stock, activo |
| `bd_clientes` | id_cliente, nombre, apellidos, telefono, email, visitas_acumuladas, descuento_fijo, activo |
| `bd_ventas` | id_pedido, fecha_hora, id_cajero, nombre_cajero, id_cliente, canal, subtotal, descuento, total, estado |
| `bd_detalle_pedidos` | id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, subtotal_linea |

---

## Architecture

### Frontend modules

| Module | Path | Role |
|--------|------|------|
| Login | `src/pages/Login.jsx` | Clerk SignIn with Fresh Matcha theme |
| Nuevo Pedido | `src/pages/NuevoPedido.jsx` | POS — cart, clients, channels |
| Pedidos Hoy | `src/pages/PedidosHoy.jsx` | Live order board (kanban) |
| Historial | `src/pages/Historial.jsx` | Paginated order history + PDF export |
| Análisis | `src/pages/Analisis.jsx` | KPIs, charts, AI chat panel |
| Clientes | `src/pages/Clientes.jsx` | CRM — client list + loyalty tracking |
| Productos | `src/pages/Productos.jsx` | Product catalog CRUD |
| Usuarios | `src/pages/Usuarios.jsx` | User management (admin only) |

### Key files

```
src/
├── api/api.js              # All GAS requests + formatting helpers
├── context/
│   ├── AuthContext.jsx     # Clerk useUser + cafe_user localStorage compat
│   └── ThemeContext.jsx    # 7 themes + darkMode derived from active theme
├── components/
│   ├── Layout.jsx          # Shell: sidebar + header + ShaderBackground
│   ├── Sidebar.jsx         # Nav + theme selector
│   ├── AISidebar.jsx       # Collapsible AI chat panel
│   └── ui/
│       └── ShaderBackground.jsx  # WebGL animated background
└── lib/
    ├── productImages.js    # EXACT_MATCH lookup for product photos
    ├── descuentos.js       # Discount logic (loyalty gifts, % discounts)
    └── clerkTheme.js       # Fresh Matcha theme for Clerk SignIn
```

### API client (`src/api/api.js`)

```js
// All GAS calls go through apiGet / apiPost — never use axios or add Content-Type headers.
// GAS follows redirects; always set redirect: 'follow'.
import { productos, clientes, pedidos, formatMXN, canalBadge, estadoBadge } from '../api/api'
```

Available helpers: `formatMXN`, `formatFecha`, `canalBadge`, `estadoBadge`, `categoriaBadge`, `generarMeses`.

> `formatFechaHora` does NOT exist — use `formatFecha`.

### Auth pattern

```js
// Inside React components — always use the hook
const { isAdmin, isCajero, user } = useAuth()
```

---

## Theme system

7 dynamic color themes controlled via `data-theme` on `<html>`.
`ThemeContext.jsx` applies the theme and derives `darkMode` from it automatically.

Only `vinyl-light` (Record Shop) is a light theme. All others are dark-only.

```js
const LIGHT_THEMES = new Set(['vinyl-light'])
const darkMode = !LIGHT_THEMES.has(tema)   // derived, not stored independently
```

See `DESIGNER.md` for full theme documentation and component classes.

---

## Critical rules

### CORS — GAS API
```js
// CORRECT — native fetch, no explicit headers
fetch(url, { method: 'POST', body: JSON.stringify(data), redirect: 'follow' })

// WRONG — axios or Content-Type header triggers CORS preflight, GAS rejects it
```

### recharts
```jsx
// CORRECT — primitive props only
<Tooltip formatter={(v) => [formatMXN(v), 'Sales']} contentStyle={TOOLTIP_STYLE} />

// WRONG — React component as content breaks with Vite 8 rolldown in production
<Tooltip content={<MyTooltip />} />
```

`recharts@2.15.3` is pinned — do not upgrade to v3 (ESM export format breaks rolldown).

### GAS deployments
Each change to `Codigo.gs` requires a **new deployment** (not editing the existing one).
Every new deployment generates a new URL → update `VITE_API_URL` in `.env` and in EasyPanel.

### Tailwind custom shades
Only defined shades exist. Always verify in `tailwind.config.js` before using `color-NN`.
For subtle tints use `color-500/10` syntax instead of assuming `-50` or `-100` exist.

---

## Setup

```bash
git clone https://github.com/kiffhei/cafe-plus.git
cd cafe-plus
npm install
cp .env.example .env   # fill in your values
npm run dev
```

## Deploy workflow

```bash
npm run build          # required before every push
npm run lint           # must be 0 errors
npm run test:run       # 20 tests must pass
git add <files>
git commit -m "type: description"
git push               # EasyPanel auto-deploys in ~5-18s
```

If EasyPanel does not pick up the push:
```bash
git commit --allow-empty -m "chore: force redeploy" && git push
```

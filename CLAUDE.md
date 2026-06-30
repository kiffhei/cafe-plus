# CLAUDE.md — Café Plus | Master
> Archivo consolidado. Actualizado: 2026-06-29 (S11 — portfolio demo readiness: credenciales demo, favicon, meta OG, screenshots, dark mode fijo por tema, mobile fix, skeletons, empty states, badges categoría, dead code)
> Reemplaza: CLAUDE_S4.md, CLAUDE_S5.md, Avance_Perplexity.md
> Contiene: bases del proyecto + estado actual + historial bugs + tareas pendientes
> **Estado actual (cierre S11):** Build estable. 7 temas (solo `vinyl-light` es claro, resto dark-only). 20 tests. `npm run lint` → 0 errores. Usuario demo `cajero / c4j3r0p4ss` activo en Clerk. **Deuda: bundle 676KB (no viable en Vite8/rolldown). B2 (tests de componentes) pendiente.**

---

## INSTRUCCIÓN DE SKILLS — LEER ANTES DE CADA TAREA

**Leer SOLO la skill relevante — no todas.**

| Tipo de tarea | Skill a leer |
|---------------|-------------|
| Nuevo componente visual / mejora UI | `/mnt/skills/public/frontend-design/SKILL.md` |
| Cambio de paleta o tipografía | `/mnt/skills/examples/theme-factory/SKILL.md` |
| Generación o modificación de PDF | `/mnt/skills/public/pdf/SKILL.md` |
| Nueva integración con n8n o GAS | `/mnt/skills/examples/mcp-builder/SKILL.md` |
| Bug fix, lógica, cálculos puros | Ninguna |
| Documentación | Ninguna |

---

## IDENTIDAD DEL PROYECTO

**Café+** — sistema de gestión operativa + CRM para cafetería en Cuautitlán, EdoMex.
Dev: Brian Anaya (kiffhei) | **Portafolio público — cada pantalla debe verse premium.**

| Recurso | URL |
|---------|-----|
| Repo GitHub | https://github.com/kiffhei/cafe-plus |
| App producción | https://clawdbot-cafe-plus.u555aa.easypanel.host |
| Backend GAS | `VITE_API_URL` en `.env` |
| Backend GAS apiKey | `VITE_GAS_API_KEY` en `.env` — debe coincidir EXACTO con string en Codigo.gs |
| n8n webhook chat IA | `VITE_N8N_WEBHOOK` en `.env` |
| EasyPanel | Ver `.env.example` para configuración |

---

## STACK TÉCNICO

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React 19.2 + Vite 8 + Tailwind CSS v3 + react-router-dom 7 | v4 Tailwind evitado por CLI |
| Estilos | Paleta Fresh Matcha + Plus Jakarta Sans + Outfit | Ver tokens abajo |
| Backend | Google Apps Script REST API | fetch nativo obligatorio — sin axios |
| Base de datos | Google Sheets (5 hojas) | Ver estructura abajo |
| Auth | Clerk (ClerkProvider + useUser + publicMetadata.categoria) | cafe_user en localStorage para compatibilidad |
| Dark mode | ThemeContext.jsx + clase `dark` en `<html>` | Todos los componentes requieren dark: |
| Deploy | Docker multistage en EasyPanel | Autodeploy en push a `main` |
| IA | n8n + OpenAI via MCP Client | Workflow Cafe_Plus |
| PDF | jsPDF | |
| Gráficas | recharts@2.15.3 | v3 incompatible con rolldown/Vite 8 |

---

## ESTRUCTURA DE GOOGLE SHEETS

| Hoja | Columnas principales |
|------|---------------------|
| `bd_usuarios` | id_usuario, nombre, apellidos, categoria (admin/cajero), usuario, password_hash, activo |
| `bd_productos` | id_producto, nombre, categoria, precio_venta, costo, cantidad_stock, activo |
| `bd_clientes` | id_cliente, nombre, apellidos, telefono, email, visitas_acumuladas, descuento_fijo, activo, notas |
| `bd_ventas` | id_pedido, fecha_hora, id_cajero, nombre_cajero, id_cliente, canal, subtotal, descuento, total, estado |
| `bd_detalle_pedidos` | id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, subtotal_linea |

---

## RUTA REAL DEL PROYECTO EN DISCO

```
~/proyectos/cafe-plus/          <- repo Git REAL — siempre trabajar aqui
~/Desktop/Claude/Cafe-Plus/     <- carpeta iCloud — NO es el repo
```

---

## PALETA — "FRESH MATCHA"

```js
// Tokens Tailwind (NO cambiar sin instruccion explicita)
cafe-500:      '#2d6a4f'   // verde primario
cafe-800:      '#0d2d1f'   // verde oscuro (dark mode surfaces)
terracota-500: '#1e6091'   // azul acento
olivo-500:     '#40916c'   // verde positivo
crema-bg:      '#f8fffe'   // fondo light
dark-bg:       '#0d1b2a'   // fondo dark

// Colores recharts — SIEMPRE ESTOS
CHART_COLORS = ['#2d6a4f', '#1e6091', '#40916c', '#48cae4', '#84cba8']

// Colores por canal (Treemap y leyendas)
// Local: #2d6a4f | Rappi: #1e6091 | Uber Eats: #40916c | DiDi Food: #48cae4
```

## TIPOGRAFIA

```css
display: 'Plus Jakarta Sans'  /* headers h1-h4 */
body:    'Outfit'             /* texto general */
mono:    'JetBrains Mono'     /* IDs, codigos */
```

---

## ESTADO DE MODULOS — ACTUALIZADO S10

| Archivo | Estado | Sesion |
|---------|--------|--------|
| Login.jsx | OK — Clerk SignIn + Fresh Matcha theme + dark mode | S6 |
| App.jsx | OK — BLOQUEADO no tocar rutas | S2 |
| Sidebar.jsx | OK — tema selector + nav items BLOQUEADO | S7 |
| ThemeContext.jsx | OK 5 temas + darkMode + localStorage | S7 |
| Layout.jsx | OK orbes CSS + cafe-sidebar-surface + hamburguesa | S7 |
| index.css | OK 7 temas CSS vars + contraste AA light mode (--cafe-accent-ink, --status-*-fg) | S9 |
| tailwind.config.js | OK paleta Fresh Matcha + cafe-accent/cafe-btn/cafe-border vars | S7 |
| api.js | OK Clerk auth + userCategoria + redirect:follow | S6 |
| AuthContext.jsx | OK Clerk useUser + cafe_user localStorage compat | S6 |
| src/lib/clerkTheme.js | OK tema Clerk con paleta Fresh Matcha | S6 |
| Usuarios.jsx | OK CRUD + toggle theme-aware | S7 |
| Productos.jsx | OK — modal-surface en ModalProducto (header/footer sticky + badge margen) + clases Tailwind inexistentes corregidas | S10 |
| Clientes.jsx | OK — modal-surface + inputs dark sin override hardcodeado + avatar bg-terracota-500/10 | S10 |
| NuevoPedido.jsx | OK — modal-surface en panel canal/cliente y panel carrito | S10 |
| PedidosHoy.jsx | OK — modal-surface en TarjetaPedido + KPI Pendientes con bgStyle/colorStyle | S10 |
| Historial.jsx | OK tabla paginada + filtros + PDF + KPI + modal total theme-aware | S7 |
| Analisis.jsx | OK — modal-surface en Hora pico y Chat IA + TOOLTIP_STYLE dinámico con darkMode | S10 |

---

## SISTEMA DE TEMAS — S7

5 temas implementados: `matcha`, `cafe-oscuro`, `medianoche`, `terracota`, `pizarra`

### Variables CSS por tema (index.css bajo `[data-theme="X"]`)

| Variable | Uso |
|----------|-----|
| `--cafe-accent` | color de acento — textos destacados, bordes activos, íconos activos |
| `--cafe-btn` | fondo de botones primarios, tabs activos, toggles ON |
| `--cafe-sb-bg` | fondo del sidebar (glassmorphism con backdrop-blur) |
| `--cafe-main-bg` | fondo del área de contenido principal |
| `--cafe-border` | bordes de superficies temáticas y kpi-card |
| `--cafe-kpi-val` | valor numérico en KPI cards (= --cafe-accent) |
| `--cafe-bg-base` | color base del fondo de página (orbes y dark mode bg) |
| `--cafe-orb1/2/3` | colores de los tres orbes animados del fondo |

### ThemeContext API

```js
const { darkMode, toggleDark, tema, setTema } = useTheme()
// localStorage: cafe_tema → ID del tema activo | cafe_theme → 'dark'/'light'
```

### Clases utilitarias activas

| Clase | Efecto |
|-------|--------|
| `cafe-sidebar-surface` | glassmorphism sidebar: var(--cafe-sb-bg) + backdrop-blur(24px) |
| `cafe-main-surface` | superficie central: var(--cafe-main-bg) + backdrop-blur(12px) |
| `cafe-border-theme` | border-color: var(--cafe-border) |
| `cafe-accent-text` | color: var(--cafe-accent) |
| `tab-active-theme` | bg: var(--cafe-btn) + color: #fff — tabs y filtros activos |
| `text-accent-theme` | color: var(--cafe-accent) — valores KPI y precios destacados |
| `btn-primary` | bg: var(--cafe-btn) + filter:brightness() para hover/active |
| `kpi-card` | bg: rgba(255,255,255,0.05) + border: var(--cafe-border) |

### Selector de temas (Sidebar.jsx)
- Swatch circular con `var(--cafe-accent)` + label "Temas" colapsable con el sidebar
- Panel con 5 opciones: swatch + nombre + check ✓ en activo
- Persiste en `localStorage.cafe_tema`; ThemeContext aplica `document.documentElement.dataset.theme`

### Fondo animado (Layout.jsx) — ShaderBackground WebGL
- **Realidad del código:** `src/components/ui/ShaderBackground.jsx` monta un canvas **WebGL** con `requestAnimationFrame` (no son orbes CSS — eso era la implementación anterior). Montado en `Layout.jsx:61`.
- El contexto WebGL se crea **una sola vez** (`useEffect([])`); los colores del shader se actualizan vía `colorsRef` sin recrear el programa → el cambio de tema/darkMode reacciona sin remount.
- `position: fixed; z-index: 0; pointer-events: none`.
- Deuda: WebGL en todas las pantallas. Si causa carga en equipos viejos, considerar fallback a orbes CSS. Ver [architecture-decisions en memoria].

---

## WORKFLOW N8N — Cafe_Plus

### Flujo actual (confirmado sesion 5)

```
Webhook (POST)
  -> IF ($request.method === 'OPTIONS')
      -> true:  Respond to Webhook [preflight — headers CORS + 200]
      -> false: BA_Envelope (Code — parsea body, detecta intent, sugiere tablas)
                  -> AI Agent (OpenAI + MCP tools Sheets)
                      -> Code in JavaScript (limpia output del agente)
                          -> Respond to Webhook [respuesta al frontend]
```

### BA_Envelope — logica del nodo Code
Extrae `pregunta`, detecta `intent` (ventas_por_canal, producto_top, etc.),
sugiere `tablas_sugeridas`, estructura `fecha_desde/hasta`.
Reduce tokens del AI Agent al darle solo lo esencial.

### Prompt del AI Agent — reglas clave
- Consultar al menos una tool antes de responder
- Prohibido responder con plantillas genericas ("Ya tengo la informacion...")
- Si no hay datos: "No tengo ese dato en la base de datos actual."
- Formato: MXN $0.00, espanol mexicano, maximo 4 parrafos
- Enrutamiento de tablas:
  - ventas/canal/ticket/cajero -> bd_ventas
  - producto top/cantidades -> bd_detalle_pedidos
  - stock/precios/catalogo -> bd_productos
  - visitas/descuentos/clientes -> bd_clientes
  - roles/usuarios -> bd_usuarios (nunca contrasenas)

### Contrato de respuesta esperado por el frontend
```json
{ "respuesta": "texto de la respuesta del agente" }
```
El frontend busca: `data?.respuesta ?? data?.output ?? data?.text`

### CORS — RESUELTO (verificado 2026-06-15, S9)
URL real del webhook: `.../webhook/cafe-plus-chat` (NO `df19bf86-…`, que era una URL vieja/obsoleta y causó un misdiagnóstico en S9 — siempre verificar la URL del bundle desplegado, no la del doc).
Verificación en vivo desde el origen de producción:
- OPTIONS → `204` con `access-control-allow-origin: https://clawdbot-cafe-plus.u555aa.easypanel.host` + `access-control-allow-methods: OPTIONS, POST`.
- POST → `200` con header ACAO + `content-type: application/json` + `{"respuesta":"..."}` real desde Sheets.
El nodo Respond to Webhook ya tiene los headers CORS configurados.

### Logging diagnostico para Analisis.jsx (agregar temporalmente)
```js
console.log('[IA] status:', res.status)
console.log('[IA] content-type:', res.headers.get('content-type'))
const raw = await res.text()
console.log('[IA] raw response:', raw)
let data = null
try { data = JSON.parse(raw) } catch(e) { console.error('[IA] parse error:', e) }
console.log('[IA] parsed data:', data)
```

---

## TAREAS COMPLETADAS — SESION 8 ✓

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| 1 | ~~AISidebar.jsx — panel derecho colapsable~~ | AISidebar.jsx + Analisis.jsx + Historial.jsx | ✓ HECHO |
| 2 | Imágenes EXACT_MATCH por nombre de producto — 18 productos mapeados | src/lib/productImages.js | ✓ HECHO |
| 3 | Thead de tablas — contraste corregido (rgba + var(--cafe-accent)) | index.css + módulos | ✓ HECHO |
| 4 | Contraste global: modal-surface, label-muted, btn-secondary, inputs dark | index.css | ✓ HECHO |
| 5 | Treemap y gráficas temáticas (TEMA_CANAL_COLORS, gradientes BarChart) | Analisis.jsx | ✓ HECHO |
| 6 | Categorías deduplicadas en NuevoPedido via normCat() | NuevoPedido.jsx | ✓ HECHO |
| 7 | Sidebar user info contraste (inline styles con darkMode) | Sidebar.jsx | ✓ HECHO |
| 8 | 7 temas: vinyl-dark + vinyl-light agregados (total 7 paletas) | index.css + Sidebar.jsx | ✓ HECHO |

## TAREAS COMPLETADAS — SESION 10 ✓

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| 1 | Auditoría visual completa — 6 módulos con bg-white/dark:bg-cafe-800 → modal-surface | Productos, Clientes, PedidosHoy, NuevoPedido, Analisis | ✓ HECHO |
| 2 | KPI "Pendientes" en PedidosHoy → bgStyle/colorStyle (iguala patrón del resto de KPIs) | PedidosHoy.jsx | ✓ HECHO |
| 3 | TOOLTIP_STYLE recharts → dinámico con darkMode (dentro del componente) | Analisis.jsx | ✓ HECHO |
| 4 | Clases Tailwind inexistentes corregidas (bg-olivo-50→bg-olivo-500/10, bg-terracota-100→bg-terracota-500/10) | Productos.jsx, Clientes.jsx | ✓ HECHO |
| 5 | VITE_GAS_API_KEY — diagnosticado faltante en EasyPanel (INC-S9-A) | EasyPanel (infra, no código) | ✓ RESUELTO |

## TAREAS COMPLETADAS — SESION 9 ✓

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| 1 | vitest + primeros tests (lógica pura) — 20 tests | productImages.test.js, descuentos.test.js, vite.config.js | ✓ `npm test` / `test:run` |
| 2 | Imágenes 404 (café americano, etc.) reemplazadas + fallback onError centralizado | productImages.js, Productos.jsx, NuevoPedido.jsx | ✓ HECHO |
| 3 | Regalo de cliente frecuente se aplica al crear pedido (descuento = N unidades más baratas) | descuentos.js, NuevoPedido.jsx | ✓ HECHO (E2E confirmado) |
| 4 | Chat IA + CORS verificados en vivo (webhook `cafe-plus-chat`) | n8n + doc | ✓ RESUELTO (ver sección CORS arriba) |
| 5 | Contraste AA de acento (`--cafe-accent-ink`) y badges de estado (`--status-*-fg`) en light mode | index.css | ✓ HECHO (estructural) |
| 6 | Code-splitting | — | ❌ NO VIABLE en Vite8/rolldown (descarta `import()` dinámicos). Bundle 676KB se queda |

## TAREAS COMPLETADAS — SESION 11 ✓

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| C1 | Credenciales demo en README (usuario Clerk cajero/c4j3r0p4ss) | README.md | ✓ `5f5c9ec` |
| C2 | Favicon corregido (vite.svg → favicon.svg) | index.html | ✓ `5f5c9ec` |
| C3 | Meta description + OG tags en index.html | index.html | ✓ `5f5c9ec` |
| A1 | Screenshots login + dashboard en README (carpeta Muestras/) | README.md | ✓ `d5b3c65` |
| A2 | Dark mode fijo por tema — solo vinyl-light es claro, toggle eliminado | ThemeContext.jsx, Layout.jsx | ✓ `269020f` |
| A3 | Mobile fix NuevoPedido — canal+cliente apilados en mobile | NuevoPedido.jsx | ✓ `80772e4` |
| M1 | Empty states con icono SVG en Productos y Clientes | Productos.jsx, Clientes.jsx | ✓ `14f5f8c` |
| M2 | Skeleton loaders en Historial, Productos y Clientes | Historial.jsx, Productos.jsx, Clientes.jsx | ✓ `14f5f8c` |
| M3 | Badges categoría corregidos (bebida/pan/sándwich/otro reales) + badge-cat-pan | api.js, index.css | ✓ `14f5f8c` |
| B1 | Dead code eliminado: export agente + const N8N en api.js; esAdmin via useAuth() en Clientes | api.js, Clientes.jsx | ✓ `33efe46` |
| B3 | Nota bundle 676KB con explicación técnica (Vite8/rolldown) en README | README.md | ✓ `11881a4` |

## TAREAS PENDIENTES — SESION 12

| # | Tarea | Archivo | Prioridad |
|---|-------|---------|-----------|
| 1 | Tests de componentes/integración — 0 cobertura en páginas (solo 20 tests de lógica pura) | src/pages/*.jsx | MEDIA |

---

## LECCIONES S11 — DECISIONES DE DISEÑO Y ERRORES

- **Dark mode toggle eliminado — decisión de diseño (INC-S11-A):** los 6 temas oscuros tenían contraste malo en light mode. En lugar de arreglar 6 paletas, se tomó la decisión de hacer esos temas dark-only. Solo `vinyl-light` soporta light. `ThemeContext` deriva `darkMode` del tema (`LIGHT_THEMES = new Set(['vinyl-light'])`). Si se añade un nuevo tema claro en el futuro, solo agregar su ID al Set.
- **`isAdmin: esAdmin` — patrón alias para migración sin renombrado masivo:** cuando un componente tiene 20+ usos de una variable con nombre legacy (`esAdmin` de localStorage), usar destructuring con alias `const { isAdmin: esAdmin } = useAuth()` permite migrar la fuente sin tocar el resto del componente. Menos riesgo, diff más limpio.
- **Binary push HTTP 400 con git:** archivos PNG grandes pueden causar `HTTP 400` al hacer push. Fix: `git config http.postBuffer 524288000` (500MB). Solo necesario al agregar binarios pesados por primera vez.
- **`categoriaBadge` mismatch — leer las categorías reales del backend antes de codificar el mapa:** se codificó el mapa con `bebidas/pastelería/extras` (nombres intuidos) cuando el backend enviaba `bebida/pan/otro`. Siempre verificar con un `console.log` o una petición real antes de hardcodear mapas de labels.

## LECCIONES S8 — ERRORES CRITICOS

- **`dark:bg-cafe-800` y `dark:text-crema-200` son verde fijo** — no reaccionan al tema activo. Usar `style={{ background: darkMode ? 'var(--cafe-sb-bg)' : 'white' }}` pasando `darkMode` de `useTheme()`
- **`text-cafe-400` en Sidebar = verde #52b788 en TODOS los temas** — en terracota/medianoche no contrasta. Usar `rgba(255,255,255,0.45)` / `rgba(0,0,0,0.45)` con darkMode
- **EXACT_MATCH en productImages es el patrón correcto** — keyword map es frágil cuando hay nombres similares (Muffin Chocolate vs Muffin Blueberry). El nombre normalizado (sin acentos, minúsculas) como key garantiza asignación determinista
- **normCat() para categorías del backend** — GAS envía "Café", "cafe", "Sándwich", "sandwich" como strings distintos. Siempre normalizar antes de deduplicar con `Set()` y filtrar
- **TEMA_CANAL_COLORS** — definir paleta por tema para Treemap y charts, no hardcodear colores globales. Pasar `tema` de `useTheme()` como argumento a la función de color
- **`<defs><linearGradient>` en recharts v2** — funciona como hijo de `<BarChart>`. Sufijo `${tema}` en el id del gradiente evita colisiones entre renders de distintos temas
- **`.modal-surface` y `.label-muted`** — clases CSS puras que usan CSS vars — las únicas que funcionan en todos los temas sin js extra. Usarlas en modals en lugar de `dark:bg-cafe-800`

## LECCIONES S7 — ERRORES CRITICOS

- **NUNCA migrar colores sin auditar TODOS los usos del token primero** — `btn-primary` afectó `thead` inesperadamente al usar `var(--cafe-btn)` como fondo de filas de encabezado
- **SIEMPRE probar contraste en el tema más saturado (terracota)** antes de dar por bueno cualquier cambio de color — el tema de mayor contraste rompe primero
- **Tailwind clases estáticas NO responden a CSS variables en runtime** — usar siempre `style={{ color: 'var(--cafe-accent)' }}` o clases utilitarias CSS puras (`.text-accent-theme`)
- El sistema de temas usa `data-theme` en `document.documentElement` — las variables se definen bajo `[data-theme="X"]` en `index.css`; ThemeContext lo aplica en `useEffect([tema])`
- **Cada prompt a Claude Code debe tener scope de UN archivo o UN concern** — mezclar 8 archivos en un prompt garantiza errores en cascada y pérdida de contexto
- Antes de cualquier cambio visual: pedir `cat` del archivo objetivo, identificar las clases exactas, luego hacer el reemplazo quirúrgico línea a línea

---

## CONVENCIONES OBLIGATORIAS

### Naming critico — errores conocidos
```js
formatFecha(str)            // OK — existe en api.js
formatFechaHora(str)        // NO EXISTE — build error garantizado

className="input-cafe"      // OK
className="input-field"     // OK alias
className="input-cafeteria" // NO EXISTE
```

### Imports de api.js
```js
import { usuarios, productos, clientes, pedidos } from '../api/api'
import { formatMXN, formatFecha, canalBadge, estadoBadge, generarMeses } from '../api/api'
// Solo para Analisis:
import { pedidosDetalle } from '../api/api'  // getAllDetalle — incluye items de detalle
```

### Leer rol del usuario
```js
// CORRECTO — via hook (componentes React)
const { isAdmin, isCajero, user } = useAuth()

// CORRECTO — fuera de componente React (si es necesario)
const user    = JSON.parse(localStorage.getItem('cafe_user') || '{}')
const esAdmin = user.categoria === 'admin'
// cafe_user lo escribe AuthContext.jsx al cargar Clerk — siempre sincronizado
```

### Dark mode — en TODOS los elementos nuevos
```jsx
className="bg-white dark:bg-cafe-800 text-cafe-800 dark:text-crema-100 border-cafe-100 dark:border-cafe-700"
```

### CORS — regla critica
```js
// OK — fetch nativo SIN headers
fetch(URL, { method: 'POST', body: JSON.stringify(data) })
// MAL — nunca axios, nunca Content-Type explicito en el cliente
```

### GAS deploy — regla critica (aprendida S6)
```
NUNCA editar una implementación existente de GAS web app.
SIEMPRE crear "Nueva implementación" → tipo Web app → Execute as: Me → Anyone.
Cada nueva implementación genera una URL nueva.
Actualizar VITE_API_URL en .env (dev) y en EasyPanel (prod) después de cada deploy.
La URL del editor NO es la URL del web app — son contextos distintos.
```

### userCategoria — regla critica (aprendida S6)
```js
// MAL — 'categoria' colisiona con el filtro de producto en GAS getProductos
url.searchParams.set('categoria', meta.categoria)

// OK — usar 'userCategoria' para el rol del usuario en apiGet/apiPost
url.searchParams.set('userCategoria', meta.categoria)
// GAS lee: params.userCategoria || body.userCategoria || 'cajero'
```

### recharts — regla critica (aprendida S4)
```jsx
// MAL — rompe en produccion con rolldown/Vite 8
<Tooltip content={<MiTooltip />} />

// OK — props primitivos siempre
<Tooltip
  formatter={(value) => [formatMXN(value), 'Ventas']}
  contentStyle={{ backgroundColor: '#0d2d1f', borderRadius: '8px' }}
  labelStyle={{ color: '#d4a96a' }}
/>

// recharts@2.15.3 — NUNCA actualizar a v3
// v3 exporta como objetos memo que rolldown tree-shakes -> TypeError en prod
```

---

## WORKFLOW DE DEPLOY

```bash
cd ~/proyectos/cafe-plus   # ruta REAL del repo

npm run build              # OBLIGATORIO antes de push
git add -A
git commit -m "tipo: descripcion concisa"
git push
# EasyPanel autodespliega en ~5-18 segundos
```

Si EasyPanel no actualiza:
```bash
git commit --allow-empty -m "chore: force redeploy"
git push
```

---

## HISTORIAL COMPLETO DE INCIDENCIAS

| # | Sesion | Problema | Regla |
|---|--------|---------|-------|
| INC-001 | S1 | CORS con axios | Solo fetch nativo en POST a GAS. Nunca axios. |
| INC-002 | S1 | Build falla en Docker | npm run build antes de CADA push |
| INC-003 | S2 | EasyPanel no actualiza | git commit --allow-empty -m "chore: force redeploy" |
| INC-005 | S2 | Autodeploy desactivado silenciosamente | Verificar en EasyPanel antes de iniciar trabajo |
| INC-S4-A | S4 | formatFechaHora no existe | Usar formatFecha |
| INC-S4-B | S4 | recharts v3 + rolldown | Usar recharts@2.15.3 |
| INC-S4-C | S4 | Tooltip como componente React | Usar formatter/contentStyle primitivos |
| INC-S4-D | S4 | Claude Code no edito disco | Pedir que use herramientas Edit/Write explicitamente |
| INC-S4-E | S4 | getPedidos sin items | Usar getAllDetalle en Analisis |
| INC-S5-A | S5 | N8N_CORS_ORIGIN en cafe-plus | La variable va en el servicio n8n, no en cafe-plus |
| INC-S5-B | S5 | N8N_CORS_ORIGIN no aplica a webhooks n8n | Usar headers en nodo Respond to Webhook |
| INC-S5-C | S5 | Treemap content prop rompe en prod | Funcion SVG primitiva (props) => retorna g element |
| INC-S5-D | S5 | VITE_N8N_WEBHOOK duplicada en entorno | Dejar solo una entrada con la URL correcta |
| INC-S5-E | S5 | Repo confundido con carpeta iCloud | Siempre trabajar desde ~/proyectos/cafe-plus/ |
| INC-S6-A | S6 | GAS web app retorna data:[] aunque editor devuelve datos | Deployment desactualizado — siempre "Nueva implementación", nunca editar la existente |
| INC-S6-B | S6 | Productos muestra 0 items aunque GAS responde ok:true | params.categoria en apiGet colisiona con filtro de producto en GAS — usar userCategoria |
| INC-S6-C | S6 | .env no estaba en .gitignore — riesgo de exponer secretos | Agregar .env y .env.* a .gitignore en todo proyecto nuevo |
| INC-S6-D | S6 | fetch sin redirect:follow — GAS redirecciones no seguidas | Agregar redirect:'follow' a fetchWithTimeout |
| INC-S7-A | S7 | VITE_CLERK_PUBLISHABLE_KEY undefined en producción — Clerk no cargaba | Dockerfile multi-stage sin ARG/ENV para vars VITE_*: Vite no las incrusta en bundle. Siempre declarar ARG + ENV antes de RUN npm run build. Cambiar CACHE_BUST al modificar cualquier VITE_* en EasyPanel. |
| INC-S8-A | S8 | dark:bg-cafe-800 verde fijo en tema terracota/vinyl — no reacciona al tema | Tailwind dark: classes son estáticas. Usar style={{ background: darkMode ? 'var(--cafe-sb-bg)' : 'white' }} con darkMode de useTheme() |
| INC-S8-B | S8 | text-cafe-400 = #52b788 verde en TODOS los temas — ilegible en terracota dark | Para user info sidebar y labels secundarios usar rgba(255,255,255,0.45) condicional al darkMode |
| INC-S8-C | S8 | Muffin Blueberry obtenía imagen de Muffin Chocolate | keyword map 'muffin' matcheaba antes de 'blueberry' — solucionado con EXACT_MATCH prioritario por nombre normalizado |
| INC-S8-D | S8 | Categorías duplicadas en NuevoPedido (Café/cafe/Sándwich/sandwich) | Backend GAS envía capitalización inconsistente. normCat() con NFD normalize + toLowerCase antes de Set() |
| INC-S8-E | S8 | Treemap colores fijos (verde/azul) ignoraban el tema activo | TEMA_CANAL_COLORS map (7 temas × 4 canales). canalColor(name, tema) recibe tema de useTheme() |
| INC-S9-A | S9 | VITE_GAS_API_KEY faltante en EasyPanel — frontend enviaba apiKey=undefined a GAS, causando 401 en todos los endpoints | Agregar VITE_GAS_API_KEY al checklist de variables de entorno al desplegar en cualquier entorno nuevo. Sin esta var, Vite la serializa como string literal "undefined" en build time. |
| INC-S9-B | S9 | bg-white/dark:bg-cafe-800 hardcodeado en 6 módulos — rompía con temas distintos a Fresh Matcha | Usar modal-surface para toda superficie de modal/card/panel. Tailwind dark: classes son estáticas y no responden al tema activo. |
| INC-S10-C | S10 | VITE_GAS_API_KEY agregada en EasyPanel pero Dockerfile no la declaraba como ARG/ENV — variable nunca llegaba al build de Vite pese a estar correcta en el panel | Cualquier VITE_* nueva debe agregarse también en Dockerfile (ARG + ENV), no solo en EasyPanel → Entorno. Verificar Dockerfile primero si una env var "correcta" sigue sin reflejarse tras redeploy. |

---

## SEGURIDAD — HALLAZGOS PENDIENTES

> Encontrados en auditoría S10 (2026-06-29). No bloquean el demo actual. Ver prioridades abajo.

| Hallazgo | Riesgo | Prioridad |
|----------|--------|-----------|
| `apiKey` fija compartida visible en bundle JS público (`VITE_GAS_API_KEY`) — única barrera de acceso al backend GAS | Cualquiera con devtools puede extraer la key y hacer requests directos a GAS | BAJA (demo), MEDIA-ALTA (producción real) |
| GAS no valida `userCategoria` contra Clerk — confía ciegamente en el parámetro que envía el frontend | Con la apiKey + devtools, se puede falsificar `userCategoria=admin` en un request directo, sin pasar por Clerk | BAJA (demo), MEDIA-ALTA (producción real) |
| Sistema `generateToken/validateToken` con `CacheService` en Codigo.gs — mecanismo de auth anterior, no integrado al flujo actual (Clerk + apiKey fija). `loginUser` no es el método de auth activo. | Confusión futura sobre qué mecanismo está activo | BAJA |

**Recomendación futura** (cuando el cliente pase a producción real con datos sensibles): mover validación de rol al backend GAS en lugar de confiar en el parámetro plano `userCategoria`. Ejemplo: validar token Clerk en GAS via `UrlFetchApp` a la API de Clerk antes de procesar cada request.

---

## HISTORIAL DE CAMBIOS POR SESIÓN

### Sesión 11 — Portfolio demo readiness (2026-06-29)
- **Credenciales demo (commit `5f5c9ec`, `ba4e2ab`):** usuario Clerk `cajero / c4j3r0p4ss` creado con username auth (sin email expuesto). README actualizado con tabla de credenciales. Favicon corregido (`/vite.svg` → `/favicon.svg`). Meta description + OG tags en `index.html`. Título cambiado a `Café+`.
- **Screenshots en README (`d5b3c65`):** tabla 2 columnas (login + dashboard) usando imágenes de `Muestras/`. Push de binarios falló con HTTP 400 → fix `git config http.postBuffer 524288000`.
- **Bundle constraint en README (`11881a4`, `ba4e2ab`):** nota explicativa del límite de 676KB con Vite 8/rolldown (code-splitting no viable).
- **Dark mode fijo por tema (`269020f`):** decisión de diseño — los 6 temas oscuros (matcha, cafe-oscuro, medianoche, terracota, pizarra, vinyl-dark) se quedaron dark-only. Solo `vinyl-light` (Record Shop) soporta light mode. Eliminado: `ThemeToggle` en `Layout.jsx`, estado independiente `dark` en `ThemeContext.jsx`. `darkMode` ahora se deriva del tema: `const darkMode = !LIGHT_THEMES.has(tema)`. `toggleDark` es un no-op mantenido por compatibilidad de API.
- **Mobile fix NuevoPedido (`80772e4`):** único problema responsive real — grid de canal+cliente con `grid-cols-2` fijo → `grid-cols-1 sm:grid-cols-2`. Resto de módulos ya tenían responsive correcto.
- **Skeletons, empty states, badges categoría (`14f5f8c`):** Historial (7 cols skeleton), Productos (img+5 cols skeleton + SVG empty state), Clientes (avatar+4 cols skeleton + SVG empty state). `categoriaBadge()` corregido a categorías reales del backend (bebida/pan/sándwich/otro vs bebidas/pastelería/extras anteriores). `badge-cat-pan` añadida en `index.css`.
- **Dead code eliminado (`33efe46`):** `export const agente` + `const N8N` removidos de `api.js` (CORS latente por Content-Type header). `esAdmin` via `localStorage` en `Clientes.jsx` → `const { isAdmin: esAdmin } = useAuth()` (patrón alias para evitar renombrar 20+ usos downstream).
- **Verificación final:** `npm run build` ✓, `npm run lint` → 0 errores, `npm run test:run` → 20/20.
- **Commits:** `5f5c9ec`, `ba4e2ab`, `11881a4`, `d5b3c65`, `269020f`, `80772e4`, `14f5f8c`, `33efe46`.

### Sesión 10 — Auditoría visual + fix VITE_GAS_API_KEY (2026-06-29)
- **Auditoría visual completa (commits `7044a08`, `ea37132`):** 6 módulos con `bg-white dark:bg-cafe-800` hardcodeado corregidos a `modal-surface` (Productos, Clientes, PedidosHoy, NuevoPedido, Analisis). Clases Tailwind inexistentes detectadas (`bg-olivo-50`, `bg-terracota-100`) → corregidas a `color-500/10`. KPI "Pendientes" en PedidosHoy migrado de clases Tailwind estáticas a `bgStyle`/`colorStyle` inline. `TOOLTIP_STYLE` en Analisis.jsx movido dentro del componente usando `darkMode` de `useTheme()` → tooltips adaptativos por tema y modo.
- **INC-S9-A — VITE_GAS_API_KEY faltante en EasyPanel:** diagnóstico vía `grep -rn "apiKey" src/` → `api.js` lee `import.meta.env.VITE_GAS_API_KEY` sin fallback en 3 lugares (`apiGet`, `apiPost` URL, `apiPost` body). Sin la variable, Vite serializa `"undefined"` literal en build → 401 en todos los endpoints GAS. El string de comparación vive en Codigo.gs (fuera del repo). **Fix: agregar la variable en EasyPanel → Environment.**
- **Hallazgos de seguridad documentados (no resueltos, ver sección SEGURIDAD):** apiKey pública en bundle, `userCategoria` sin validación server-side, sistema de tokens legado en GAS no integrado al flujo actual.
- **Fix definitivo del incidente VITE_GAS_API_KEY (commit `c255269`):** el Dockerfile tenía una lista fija de ARG/ENV para variables VITE_* y nunca se actualizó al agregar la nueva variable. Agregar una env var en EasyPanel no es suficiente — Vite solo inyecta en build-time las variables que el Dockerfile explícitamente declara y expone. Confirmado resuelto en producción.

### Sesión 9 — Tests, imágenes, regalo, CORS, contraste AA light mode (2026-06-15)
- **vitest instalado (primer testing del proyecto):** `vitest@4.1.9` + scripts `test`/`test:run`. `vite.config.js` con `test.include: ['src/**/*.{test,spec}.{js,jsx}']` — IMPRESCINDIBLE: sin ese scope vitest corre las ~391 suites `bun:test` de `.claude/skills/gstack/` y "fallan". **20 tests verdes:** `productImages.test.js` (11) + `descuentos.test.js` (9). Commits `32ba710`, `08ea5d4`.
- **Imágenes de producto rotas (`19e6d59`):** 4 fotos de Unsplash daban 404 (café americano, macchiato, dona, limonada) y los `onError` ocultaban la img → quedaba en blanco. Reemplazadas por IDs verificados 200 + `handleProductImageError()` que degrada a la foto default una vez (sin loop), cableado en Productos y NuevoPedido. **Lección:** un test de mapeo puede pasar mientras la feature está rota — verificar el efecto (curl 200), no solo el valor.
- **Regalo de cliente frecuente (`08ea5d4`):** el regalo por visitas (café/muffin gratis en hito 5/10/15) se mostraba pero nunca se aplicaba al pedido. `src/lib/descuentos.js` (`regaloPorVisitas` + `calcularRegaloDescuento`, lógica pura testeada) lo traduce a descuento = suma de las N unidades cualificantes más baratas del carrito. `descuento_aplicado` del payload ahora incluye el regalo. Descuento % se mantiene fijo 5%/30%. **E2E confirmado por Brian.**
- **CORS chat IA — RESUELTO y verificado (`7dccd85`):** misdiagnóstico inicial por doc-drift — CLAUDE.md tenía la URL vieja `df19bf86-…`; la real desplegada es `.../webhook/cafe-plus-chat` (se obtuvo grepeando el bundle de producción). En vivo: OPTIONS→204 + `access-control-allow-origin`; POST→200 + `{respuesta}` real desde Sheets. **Lección:** verificar la URL del bundle desplegado, no la del doc.
- **Contraste AA en light mode (`fff3016`, `da53c09`):** el `--cafe-accent` y los `--status-*-fg` de cada tema están afinados para fondos oscuros; como texto sobre superficies claras fallaban WCAG AA (acento 1.47–2.47:1, badges 1.27–2.16:1, verificado por cálculo). Fix sin regresión: var `--cafe-accent-ink` + overrides `--status-*-fg` **solo en light mode** (`html:not(.dark)[data-theme]`), tono preservado, ≥4.6:1. Dark mode y chrome oscuro intactos (fallback al brillante). `.cafe-accent-text` NO se tocó (solo vive en el sidebar oscuro).
- **Code-splitting (#3) — NO VIABLE:** probado que rolldown (Vite 8) descarta los `import()` dinámicos del build (jspdf desaparecía → PDF roto). `codeSplitting:true` no lo arregla. El bundle de 676KB es recharts+React+Clerk (jspdf ya estaba en chunk aparte). App.jsx bloqueado impide lazy de rutas. Decisión: dejar el bundle como está.
- **Pendiente para S10 (decisión de Brian):** light mode aún tiene detalles visuales de contraste; la próxima sesión es **exclusivamente diseño gráfico**.

### Sesión 7 — Fix Dockerfile (2026-06-12)
- **Root cause identificado:** multi-stage build sin `ARG`/`ENV` para variables `VITE_*` — Vite no podía incrustarlas en el bundle durante el build en EasyPanel.
- **Dockerfile corregido:** bloque `ARG → ENV → RUN npm run build` para `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`, `VITE_N8N_WEBHOOK`.
- **`ARG CACHE_BUST=20260612_3`** agregado para forzar invalidación de caché Docker.
- **App restaurada:** Clerk carga correctamente en producción.
- **Regla para futuros deploys:** si se cambia un valor `VITE_*` en EasyPanel, cambiar también el valor de `CACHE_BUST` para forzar rebuild completo.

### Cierre S8 — Auditoría real + build para producción (2026-06-15)
- **Auditoría con herramientas (no con fe):** build ✓, lint real, grep de patrones. Hallazgos corregidos:
- **`tailwind.config.js` sin commitear** (fix de sombras verde→neutral de S8) — **nunca había llegado a producción**. Commiteado aislado y primero: `3bf23ca`.
- **eslint lintaba `.claude/skills/gstack/`** → 235 errores falsos ocultaban 19 reales en `src/`. Agregado ignore de `.claude` → lint real visible.
- **Código muerto removido:** `CHART_COLORS`, `calcularProductoTop` (Analisis), `canalBadge` + `user` (NuevoPedido), `esAdmin` param (Clientes).
- **catch vacíos** justificados con comentario; `api.js` re-lanza `AbortError` con `{ cause }`.
- **`axios` removido** de package.json — estaba como dependencia muerta (no se usaba; viola regla solo-fetch).
- **2 reglas de lint a `warn`** (set-state-in-effect, only-export-components) — idioms de framework, documentado inline en `eslint.config.js`. Resultado: `npm run lint` → **0 errores, 9 warnings**.
- **Doc corregida:** CLAUDE.md/DESIGNER.md decían "React 18" y "fondo = orbes CSS" — falso. Real: **React 19.2 + Router 7**, **fondo = ShaderBackground WebGL**.
- **Commits:** `3bf23ca` (fix sombras, prod), `00a58ab` (chore cleanup, no-prod).
- **Verificación:** `npm run build` ✓ (4.45s), `npm run lint` exit 0.
- **Deuda explícita documentada (NO resuelta):** 0 tests automatizados, bundle 676KB sin code-splitting. Ver `tasks-s9.md`. **Declarar "100% production-ready" con 0 tests sería deshonesto** — el build es estable y verificado manualmente, pero sin red de seguridad automatizada.

### Sesión 8 — Contraste global + imágenes + gráficas temáticas (2026-06-15)
- **Contraste global resuelto:** nuevas clases `.modal-surface` (var(--cafe-sb-bg) dark / rgba(255,255,255,0.96) light) y `.label-muted` (rgba con darkMode) en `index.css` — sustituyen `dark:bg-cafe-800` hardcodeado en modals.
- **`btn-secondary` dark:** regla `.dark .btn-secondary` con CSS vars en lugar de Tailwind — funciona en todos los temas.
- **EXACT_MATCH en productImages.js:** 18 productos del catálogo mapeados por nombre normalizado. Lookup directo O(1) con prioridad sobre keyword map. `normCat()` y `norm()` para normalización NFD.
- **normCat() en NuevoPedido:** elimina duplicados de categorías del backend (Café/cafe/Sándwich) via NFD normalize + toLowerCase antes de `Set()`.
- **TEMA_CANAL_COLORS en Analisis.jsx:** paleta de 4 colores × 7 temas para Treemap. `canalColor(name, tema)` usa el tema activo de `useTheme()`.
- **Gradientes en BarChart:** `<defs><linearGradient>` dentro de `<BarChart>` en recharts v2. 3 niveles (high/mid/low) por valor relativo. IDs sufijados con `${tema}` para evitar colisiones.
- **Sidebar user info:** `text-cafe-400` reemplazado por inline styles con `darkMode` — `rgba(255,255,255,0.85/0.45)` en dark, `var(--cafe-accent)/rgba(0,0,0,0.45)` en light.
- **7 temas:** `vinyl-dark` y `vinyl-light` agregados al sistema (selector en Sidebar.jsx).
- **Commits:** `d40a234`, `b3bc241`, `f317fa5`, `f154bf2`.

### Sesión 7 — Sistema de temas dinámicos (2026-06-12)
- **5 temas de color implementados:** `matcha`, `cafe-oscuro`, `medianoche`, `terracota`, `pizarra` — cada uno define `--cafe-bg-base`, `--cafe-orb1/2/3`, `--cafe-accent`, `--cafe-btn`, `--cafe-sb-bg`, `--cafe-main-bg`, `--cafe-border`, `--cafe-kpi-val` en `[data-theme="X"]` en `index.css`.
- **Orbes animados con CSS puro:** 3 divs `.cafe-orb` con `@keyframes cafe-breathe` y `filter: blur(80px)` — sin JavaScript de animación.
- **ThemeContext.jsx extendido:** `{ darkMode, toggleDark, tema, setTema }` — `tema` persiste en `localStorage.cafe_tema`; `setTema` aplica `document.documentElement.dataset.theme = tema`.
- **Clases utilitarias temáticas:** `.tab-active-theme` (bg: `var(--cafe-btn)`) y `.text-accent-theme` (color: `var(--cafe-accent)`) en `@layer components` para usar en `className`.
- **Migración `btn-primary`:** reemplazado `bg-cafe-500 hover:bg-cafe-600` por `var(--cafe-btn)` + `filter: brightness(1.15)` en hover — funciona en todos los temas sin colores adicionales.
- **Migración `kpi-card`:** reemplazado `glass-card` (bg-white/80) por `rgba(255,255,255,0.05)` + `border: 1px solid var(--cafe-border)`.
- **Migración `table-wrapper thead`:** descendant rule con `background: var(--cafe-btn)` — **deuda técnica:** contraste roto en tema terracota, pendiente fix S8.
- **Migración `input-cafe:focus`:** `focus:ring-cafe-400` → `border-color: var(--cafe-accent)` + `box-shadow: color-mix(in srgb, var(--cafe-accent) 20%, transparent)`.
- **Colores de gráficas temáticos:** tablas estáticas `TEMA_CHART_PRIMARY` / `TEMA_CHART_BTN` en `Analisis.jsx` para evitar timing issues de `getComputedStyle` vs `useEffect([tema])`.
- **7 módulos migrados:** `Analisis.jsx`, `Productos.jsx`, `NuevoPedido.jsx`, `Historial.jsx`, `Clientes.jsx`, `Usuarios.jsx`, `PedidosHoy.jsx` — todos los `bg-cafe-700`, `bg-olivo-500`, `text-terracota-500` reemplazados.

---

## OPTIMIZACION DE TOKENS

### Reglas activas
- Skills routing — leer solo la skill relevante (mapa al inicio)
- /compact — cuando la sesion llegue al 40-50% de contexto
- Conversacion nueva — al cambiar de tema o despues de 2h de trabajo
- Desconectar MCPs no usados en la sesion (Stripe, Indeed, Twilio, HubSpot, Splice, Canva, Supabase)

### Repo ahorra-tokens-claude (AIMAX — cuando sea necesario)
```bash
git clone https://github.com/david-ai-pro/ahorra-tokens-claude.git
cd ahorra-tokens-claude && bash install.sh
```

### Graphify — cuando el proyecto supere 50 archivos
```bash
pip install graphify
cd ~/proyectos/cafe-plus && graphify build
```

---

## SKILLS GSTACK (garrytan/gstack)

Instaladas en .claude/skills/gstack/. Telemetria OFF.

| Skill | Cuando usar |
|-------|------------|
| /plan-eng-review | Antes de Clerk, modulos nuevos, cambios de arquitectura |
| /design-review | Antes de publicar portafolio o mostrar al cliente |
| /review | Al terminar un modulo completo |
| /qa | Antes de cada deploy importante |
| /office-hours | Decisiones de arquitectura |

Flujo recomendado: /plan-eng-review -> implementar -> /review -> /qa -> push

---

## SUBAGENTE ESPECIALIZADO

Crear .claude/agents/frontend-cafe.yaml:
```yaml
name: frontend-cafe
description: Especialista en React + Tailwind para Cafe+
model: claude-sonnet-4-6
tools: [read, write, bash]
prompt: |
  Especialista en React 19 + Vite 8 + Tailwind CSS para Cafe+.
  Paleta Fresh Matcha: cafe-500=#2d6a4f, terracota-500=#1e6091.
  Tipografia: Plus Jakarta Sans (display) + Outfit (body).
  Reglas: formatFecha (no formatFechaHora), input-cafe (no input-cafeteria),
  dark mode en todo, fetch nativo sin headers, recharts@2.15.3.
  Leer /mnt/skills/public/frontend-design/SKILL.md antes de crear UI.
```

---

## PROMPT DE INICIO SESION 7

```
Lee el CLAUDE.md en la raiz del proyecto.
Confirma estado de modulos y lista de tareas pendientes.

CONTEXTO S6: Clerk auth implementado y mergeado a main.
GAS v1.5 desplegado con getSS() y userCategoria.
Todos los módulos funcionales.

TAREA PRIORITARIA — CORS chat IA (sigue pendiente):
En n8n, nodo Respond to Webhook -> Options -> Response Headers, agregar:
  Access-Control-Allow-Origin: https://clawdbot-cafe-plus.u555aa.easypanel.host
  Access-Control-Allow-Methods: POST, OPTIONS
  Content-Type: application/json

ANTES DE CODIFICAR — verificar en Clerk dashboard:
1. Usuarios creados con email+password
2. publicMetadata.categoria asignado ('admin' o 'cajero')
Sin esto, todos los usuarios tendrán rol 'cajero' y no podrán acceder a Productos/Usuarios.

No tocar App.jsx ni Sidebar.jsx.
npm run build antes de cualquier push.
/compact si el contexto llega al 40%.
```

---

## PROMPT DE INICIO SESION 8

```
Lee el CLAUDE.md en la raiz del proyecto.
Confirma estado de modulos y lista de tareas pendientes.

CONTEXTO S7 (completado):
- Bug Dockerfile (INC-S7-A) resuelto — Clerk funcional en producción.
- Sistema de temas dinámicos implementado: 5 paletas (matcha/cafe-oscuro/medianoche/terracota/pizarra).
- Todos los módulos migrados a CSS custom properties (var(--cafe-btn), var(--cafe-accent)).
- btn-primary, kpi-card, input-cafe:focus, table-wrapper thead migrados en index.css.
- DEUDA TÉCNICA ACTIVA: thead de tablas — contraste roto en tema terracota (tarea #3 abajo).

TAREAS PENDIENTES S8 (en orden de prioridad):
1. AISidebar.jsx — panel derecho colapsable para Análisis e Historial (ALTA)
2. Imágenes automáticas por categoría en cards de NuevoPedido (ALTA)
3. Thead de tablas — fix contraste en index.css: usar rgba(255,255,255,0.08) + color: var(--cafe-accent), NO var(--cafe-btn) como fondo (ALTA — deuda técnica S7)
4. CORS chat IA — headers en nodo Respond to Webhook en n8n (no código, no Claude Code)
5. Light mode — probar y corregir contraste con el nuevo sistema de temas (MEDIA)

REGLA DOCKERFILE: si se cambia un valor VITE_* en EasyPanel, actualizar CACHE_BUST en Dockerfile.
REGLA TEMAS: nunca usar bg-cafe-700, bg-olivo-500 ni text-terracota-500 — usar tab-active-theme, text-accent-theme, o style={{ background: 'var(--cafe-btn)' }}.

No tocar App.jsx ni Sidebar.jsx.
npm run build antes de cualquier push.
/compact si el contexto llega al 40%.
```

---

## PROMPT DE INICIO SESION 10 — EXCLUSIVAMENTE DISEÑO GRÁFICO

```
Lee el CLAUDE.md y el DESIGNER.md en la raíz del proyecto, y las memorias en
~/.claude/projects/-Users-brianear-proyectos-cafe-plus/memory/ (MEMORY.md → tasks-s9.md).

ESTA SESIÓN ES EXCLUSIVAMENTE DE DISEÑO GRÁFICO. No funcionalidad nueva, no backend,
no lógica. Llevan varias sesiones sin cerrar el pulido visual y el objetivo es terminarlo.
Portafolio público — cada pantalla debe verse premium.

CONTEXTO S9 (cerrado, NO retocar salvo que el diseño lo exija):
- Tests con vitest (20), imágenes 404 corregidas, regalo de cliente frecuente E2E OK,
  CORS chat IA verificado (webhook cafe-plus-chat).
- Contraste AA ESTRUCTURAL ya resuelto en light mode: var --cafe-accent-ink (texto de
  acento) y overrides --status-*-fg (badges) bajo html:not(.dark)[data-theme] en index.css.
  Verificado por cálculo, NO visualmente.

ALCANCE — en orden de prioridad:
1. LIGHT MODE — detalles de contraste que QUEDAN (lo dijo Brian: "sigue con detalles").
   El audit AA por cálculo está hecho; falta el QA VISUAL real. Recorrer los 7 temas
   (matcha, cafe-oscuro, medianoche, terracota, pizarra, vinyl-dark, vinyl-light) en
   modo LIGHT y revisar con ojos: textos, inputs, tablas, badges, sidebar, panel IA,
   cards, gráficas. Atención al combo "sidebar/panel IA oscuros + contenido claro".
   >>> Requiere la app corriendo. Pedir a Brian que maneje el login de Clerk, o que
       pase screenshots por tema, o levantar npm run dev y coordinar acceso.
2. Badges de CATEGORÍA dinámicos en Productos.jsx e Historial.jsx (siguen hardcodeados
   en verde) — crear categoriaBadge(cat) en api.js, análogo a canalBadge.
3. Skeleton loaders en lugar de spinners (Analisis, Historial, Productos, Clientes).
4. Empty states ilustrados por módulo (0 productos, 0 clientes, etc.).

REGLAS DE TEMAS (críticas — ver DESIGNER.md):
- NUNCA bg-cafe-700, bg-olivo-500, text-terracota-500, dark:bg-cafe-800, text-cafe-400
  hardcodeados. Usar var(--cafe-*), .text-accent-theme, .tab-active-theme, .modal-surface,
  .label-muted, o inline style con darkMode de useTheme().
- Texto de acento sobre superficie CLARA → var(--cafe-accent-ink, var(--cafe-accent)).
  Sobre superficie OSCURA → var(--cafe-accent).
- Probar SIEMPRE el tema más saturado (terracota/pizarra) y AMBOS modos.
- Auditar TODOS los usos de un token antes de migrarlo (lección INC-S7).

No tocar App.jsx ni Sidebar.jsx. recharts@2.15.3 (no v3). fetch nativo (no axios).
npm run build + npm run lint (0 errores) + npm run test:run (20/20) antes de cada push.
git status LIMPIO antes de cerrar. /compact al 40% de contexto.
```

---

## CREDENCIALES DE PRUEBA

Ver `CLAUDE.internal.md` (no commiteado — en `.gitignore`).

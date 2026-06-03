# CLAUDE.md — Café Plus | Sesión 5
> Contexto para Claude Code. Actualizado: 2026-06-02
> Skills a aplicar: frontend-design, theme-factory (/mnt/skills/public/ y /mnt/skills/examples/)

---

## INSTRUCCIÓN DE SKILLS — LEER ANTES DE CADA TAREA

Antes de ejecutar cualquier tarea, identifica qué skills aplican y léelas.
**No leas todas — consume tokens innecesariamente.**

```
Skills disponibles:
/mnt/skills/public/frontend-design/SKILL.md   → diseño visual, componentes React, UI
/mnt/skills/public/pdf/SKILL.md               → generación de PDFs con jsPDF
/mnt/skills/examples/theme-factory/SKILL.md   → paletas de color y tipografía
/mnt/skills/examples/mcp-builder/SKILL.md     → integraciones con APIs externas
```

**Mapa tarea → skill (leer SOLO la que aplica):**

| Tipo de tarea | Skill a leer |
|---------------|-------------|
| Nuevo componente visual / mejora UI | `frontend-design` |
| Cambio de paleta o tipografía | `theme-factory` |
| Generación o modificación de PDF | `pdf` |
| Nueva integración con n8n o GAS | `mcp-builder` |
| Bug fix, lógica, cálculos puros | Ninguna |
| Documentación (README, CLAUDE.md) | Ninguna |

---

## IDENTIDAD DEL PROYECTO

**Café+** — sistema de gestión operativa + CRM para cafetería en Cuautitlán, EdoMex.
Dev: Brian Anaya (kiffhei) | **Portafolio público → cada pantalla debe verse premium.**

- **Repo:** https://github.com/kiffhei/cafe-plus
- **Prod:** https://clawdbot-cafe-plus.u555aa.easypanel.host
- **Backend GAS:** https://script.google.com/macros/s/AKfycbwtDGwTv2T8MiyWZOS3bXfOOWutNgFPGbZZeqaed7yHhd4OnFXuW5LYAXl27ao4QJ3w/exec
- **Spreadsheet ID:** 1GdeZReoLbIhZc9kRGK7IjhsgaNds8O26uEGQVvY1dq4
- **n8n base:** https://appn8n-n8n.u555aa.easypanel.host
- **n8n webhook chat IA:** https://appn8n-n8n.u555aa.easypanel.host/webhook/df19bf86-8f1a-46af-af4f-71a7a253fd24

---

## ESTADO DE MÓDULOS AL CIERRE DE SESIÓN 4

| Archivo | Estado | Notas |
|---------|--------|-------|
| Login.jsx | ✅ Completo | — |
| Layout.jsx | ✅ Mobile responsive + header-glass | mobileOpen implementado |
| ThemeContext.jsx | ✅ | — |
| **App.jsx** | ✅ **BLOQUEADO** | No tocar rutas ni guards |
| **Sidebar.jsx** | ✅ **BLOQUEADO** | No tocar nav items ni rutas |
| Usuarios.jsx | ✅ CRUD + table-wrapper mobile | — |
| Productos.jsx | ✅ CRUD + toggle + mobile | — |
| Clientes.jsx | ✅ CRUD + badges + mobile | Pendiente: campo notas, historial pedidos |
| NuevoPedido.jsx | ✅ Carrito + descuentos + mobile | — |
| PedidosHoy.jsx | ✅ Kanban + autorefresh + ordenamiento | — |
| Historial.jsx | ✅ Tabla paginada + filtros + PDF | Ordenamiento por columna implementado |
| Analisis.jsx | ✅ KPIs + recharts + chat n8n | Bugs pendientes (ver abajo) |
| tailwind.config.js | ✅ Paleta Fresh Matcha + tipografía premium | Plus Jakarta Sans + Outfit |
| index.css | ✅ Glassmorphism + microanimaciones + stagger | header-glass, kpi-card, accent-strip |

---

## PALETA ACTUAL — "FRESH MATCHA"

```js
// Tokens Tailwind actuales (NO cambiar sin instrucción explícita)
cafe-500:      '#2d6a4f'   // verde primario
terracota-500: '#1e6091'   // azul acento
olivo-500:     '#40916c'   // verde positivo
crema-bg:      '#f8fffe'   // fondo light
dark-bg:       '#0d1b2a'   // fondo dark

// Colores para recharts (USAR ESTOS — no los anteriores café/marrón)
CHART_COLORS = ['#2d6a4f', '#1e6091', '#40916c', '#48cae4', '#84cba8']
```

---

## TIPOGRAFÍA ACTUAL

```css
display: 'Plus Jakarta Sans'  /* headers h1-h4, títulos de sección */
body:    'Outfit'             /* texto general, labels, botones */
mono:    'JetBrains Mono'     /* IDs, códigos, valores numéricos */
```

---

## BUGS PENDIENTES DE SESIÓN 4

### BUG A — Producto Top muestra "—" en Analisis.jsx
La función `calcularProductoTop` no parsea correctamente el campo `items`.
Fix requerido:
```js
// Agregar console.log para ver estructura real antes de corregir:
console.log('items sample:', pedidos[0]?.items, typeof pedidos[0]?.items)

// El campo items puede venir como:
// a) string JSON: '[{"nombre_producto":"Café","cantidad":2}]'
// b) objeto ya parseado: [{nombre_producto:"Café", cantidad:2}]
// c) string con escape: "{\"nombre_producto\":\"Café\"}"
// Manejar los tres casos con try/catch
```

### BUG B — Colores de gráficas no actualizados
`CHART_COLORS` en Analisis.jsx sigue con paleta café/marrón anterior.
Cambiar a: `['#2d6a4f', '#1e6091', '#40916c', '#48cae4', '#84cba8']`

---

## TAREAS DE SESIÓN 5 (orden de ejecución)

### TAREA 1 — CORS en n8n para chat IA (fix en n8n, no en código)
### TAREA 2 — Mejoras CRM en Clientes.jsx
### TAREA 3 — Gráfica hora pico en Analisis.jsx
### TAREA 4 — Auth con Clerk (rama separada feat/clerk-auth)
### TAREA 5 — README.md técnico

---

## TAREA 1 — CORS EN N8N (no requiere cambios de código)

**Síntoma:** `Access-Control-Allow-Origin` bloqueado al hacer POST al webhook de n8n.
**Causa:** n8n no agrega headers CORS por defecto en respuestas del nodo Webhook.

**Fix opción A — Variable de entorno en EasyPanel (más rápido):**
En EasyPanel → servicio n8n → Entorno, agregar:
```
N8N_CORS_ORIGIN=https://clawdbot-cafe-plus.u555aa.easypanel.host
```
Reiniciar el contenedor de n8n.

**Fix opción B — En el workflow de n8n:**
1. Abrir workflow `Cafe_Plus` en n8n
2. Nodo Webhook → activar "Respond to Webhook" → "Using Respond to Webhook Node"
3. En el nodo de respuesta final agregar headers:
   ```
   Access-Control-Allow-Origin: https://clawdbot-cafe-plus.u555aa.easypanel.host
   Access-Control-Allow-Methods: POST, OPTIONS
   ```
4. Agregar nodo IF al inicio para manejar preflight OPTIONS:
   - Condición: `{{ $request.method }} === 'OPTIONS'`
   - Branch true → Respond con status 200 y headers CORS
   - Branch false → flujo normal del agente del proyecto

---

## TAREA 2 — MEJORAS CRM EN CLIENTES.JSX

El módulo de Clientes Plus ya tiene CRUD y badges. Agregar funcionalidades CRM:

### 2A — Campo "Notas / Preferencias" por cliente
Agregar campo `notas` en el modal de edición de cliente:
```jsx
// En el form del modal:
<div>
  <label className="block text-xs font-medium text-cafe-600 mb-1">
    Notas y preferencias
    <span className="text-cafe-400 font-normal ml-1">(alergias, preferencias, etc.)</span>
  </label>
  <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
    className="input-cafe w-full resize-none" rows={2}
    placeholder="Ej: sin azúcar, alérgico a gluten, prefiere leche de avena..." />
</div>
```

En la tabla, mostrar un ícono 📝 si el cliente tiene notas (tooltip al hover con el texto).

**Requiere agregar columna `notas` en `bd_clientes` en Google Sheets.**

### 2B — Historial de pedidos por cliente (modal)
En cada fila de cliente, agregar botón "Ver pedidos" que abre un modal con:
- Últimos 10 pedidos del cliente
- Columnas: fecha, canal, productos (resumen), total, estado
- Llamada a API: `pedidos.getAll({ id_cliente: cliente.id_cliente, limit: 10 })`
- Si no hay pedidos: mensaje "Este cliente aún no tiene pedidos registrados"
- Solo visible si `visitas_acumuladas > 0`

```jsx
// Botón en la fila de la tabla:
{c.visitas_acumuladas > 0 && (
  <button onClick={() => setModalPedidos(c)}
    className="text-xs text-cafe-500 hover:text-cafe-800 font-medium hover:underline">
    Ver pedidos
  </button>
)}
```

### 2C — Indicador "Cliente inactivo"
Si un cliente tiene `visitas_acumuladas > 0` pero su último pedido fue hace más de 30 días,
mostrar badge 💤 "Inactivo" en su fila.

El dato `ultimo_pedido` debe venir del backend GAS o calcularse desde los pedidos.
Si no está disponible en la API actual, omitir y documentar como pendiente de backend.

---

## TAREA 3 — GRÁFICA DE HORA PICO EN ANALISIS.JSX

Agregar una cuarta gráfica debajo de las existentes:

### Especificación
- **Título:** "Pedidos por hora del día"
- **Tipo:** BarChart horizontal o vertical con 24 barras (horas 0-23)
- **Datos:** contar pedidos por hora extraída de `fecha_hora` de cada pedido
- **Highlight:** la barra de la hora con más pedidos en color `terracota-500` (#1e6091),
  las demás en `cafe-400` (#52b788)
- **Eje X:** mostrar solo horas con formato "HH:00" (ej: "08:00", "14:00")
- **Tooltip:** "N pedidos a las HH:00"

### Función de cálculo (frontend, sobre los pedidos ya cargados)
```js
function calcularHoraPico(pedidos) {
  const conteo = Array(24).fill(0)
  pedidos.forEach(p => {
    if (!p.fecha_hora) return
    const d = new Date(p.fecha_hora)
    if (!isNaN(d.getTime())) {
      conteo[d.getHours()]++
    }
  })
  return conteo.map((count, hora) => ({
    hora: `${String(hora).padStart(2, '0')}:00`,
    pedidos: count,
    esPico: count === Math.max(...conteo)
  }))
}
```

### Render
```jsx
<BarChart data={calcularHoraPico(pedidos)} ...>
  <Bar dataKey="pedidos">
    {calcularHoraPico(pedidos).map((entry, i) => (
      <Cell key={i} fill={entry.esPico ? '#1e6091' : '#52b788'} />
    ))}
  </Bar>
</BarChart>
```

**Nota:** No usar componentes custom como props de recharts (ver INC-recharts abajo).

---

## TAREA 4 — AUTH CON CLERK

Implementar en rama separada `feat/clerk-auth`. No mergear a main hasta validar.

```bash
git checkout -b feat/clerk-auth
```

### Instalación
```bash
npm install @clerk/clerk-react
# Versión compatible con React 18+: ^5.61.3
```

### Variable de entorno (agregar en .env Y en EasyPanel cuando se mergee)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxx
# Obtener en: clerk.com → Dashboard → API Keys
```

### Qué aporta al portafolio
- 2FA real: email OTP + TOTP (Google Authenticator)
- JWT industry-standard
- Dashboard de usuarios en clerk.com
- Mucho más impresionante que SHA256 en Sheets

### Archivos a modificar (SOLO en rama feat/clerk-auth)
1. `main.jsx` — envolver con `<ClerkProvider>`
2. `src/context/AuthContext.jsx` — leer `useUser()` de Clerk
3. `src/lib/clerkTheme.js` — nuevo archivo con paleta Fresh Matcha

### Appearance Clerk — paleta Fresh Matcha
```js
// src/lib/clerkTheme.js
export const clerkTheme = {
  variables: {
    colorPrimary:         '#2d6a4f',
    colorBackground:      '#f8fffe',
    colorText:            '#1a2e2a',
    colorInputBackground: '#ffffff',
    colorInputText:       '#1a2e2a',
    borderRadius:         '0.5rem',
    fontFamily:           '"Outfit", system-ui, sans-serif',
  }
}
```

### Estrategia de integración sin romper GAS
- Clerk maneja sesión + 2FA
- GAS sigue siendo la BD de datos (sin cambios en backend)
- `AuthContext.jsx` se adapta: `useUser()` de Clerk en lugar de localStorage
- `user.publicMetadata.categoria` = `'admin'` | `'cajero'`
  (configurar en dashboard de Clerk por usuario)

---

## TAREA 5 — README.md TÉCNICO

Crear `README.md` en la raíz del repo con:

```markdown
# Café+ — Sistema de Gestión para Cafetería

## Stack
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Google Apps Script (REST API)
- Base de datos: Google Sheets
- IA: n8n + OpenAI/Claude via MCP
- Deploy: Docker + EasyPanel (autodeploy en main)

## Módulos
[tabla de módulos con descripción breve]

## Variables de entorno
VITE_API_URL=
VITE_N8N_WEBHOOK=
VITE_CLERK_PUBLISHABLE_KEY= (opcional)

## Deploy local
npm install
npm run dev

## Notas técnicas
- Apps Script + CORS: solo fetch nativo sin headers en POST
- recharts: usar recharts@2.15.3 (v3 incompatible con rolldown/Vite 8)
- Dark mode: clase `dark` en <html>, manejado por ThemeContext
```

---

## CONVENCIONES OBLIGATORIAS

### Naming crítico
```js
formatFecha(str)        // ✅ existe en api.js
formatFechaHora(str)    // ❌ NO EXISTE — build error garantizado

className="input-cafe"  // ✅
className="input-field" // ✅ alias
className="input-cafeteria" // ❌ NO EXISTE
```

### Imports de api.js
```js
import { usuarios, productos, clientes, pedidos } from '../api/api'
import { formatMXN, formatFecha, canalBadge, estadoBadge } from '../api/api'
```

### Dark mode (aplicar en TODOS los elementos nuevos)
```jsx
className="bg-white dark:bg-cafe-800 text-cafe-800 dark:text-crema-100 border-cafe-100 dark:border-cafe-700"
```

### CORS — Apps Script y n8n
```js
// ✅ fetch nativo SIN headers
fetch(URL, { method: 'POST', body: JSON.stringify(data) })
// ❌ Nunca axios, nunca Content-Type explícito
```

### recharts — regla crítica aprendida en sesión 4
```jsx
// ❌ NUNCA pasar componentes React como props de recharts
<Tooltip content={<MiTooltip />} />           // rompe en producción
<Tooltip content={(props) => <MiTooltip />} /> // también rompe

// ✅ SIEMPRE usar props primitivos de recharts
<Tooltip
  formatter={(value) => [formatMXN(value), 'Ventas']}
  contentStyle={{ backgroundColor: '#0d2d1f', borderRadius: '8px' }}
/>

// ❌ NUNCA usar recharts v3 con Vite 8 / rolldown
// ✅ SIEMPRE usar recharts@2.15.3
```

---

## WORKFLOW DE DEPLOY

```bash
cd ~/proyectos/cafe-plus   # ← ruta real del repo

npm run build              # OBLIGATORIO antes de push
git add -A
git commit -m "feat: descripción del cambio"
git push
# EasyPanel autodespliega en ~5-18 segundos
```

---

## INCIDENCIAS CONOCIDAS — NO REPETIR

| # | Problema | Regla |
|---|---------|-------|
| INC-001 | CORS axios | Solo fetch nativo en POST a GAS o n8n |
| INC-002 | Build falla en Docker | `npm run build` antes de CADA push |
| INC-003 | EasyPanel no actualiza | `git commit --allow-empty -m "chore: force redeploy"` |
| INC-005 | Autodeploy desactivado | Verificar antes de iniciar trabajo |
| INC-S4-A | formatFechaHora | No existe → usar formatFecha |
| INC-S4-B | recharts v3 + rolldown | Usar recharts@2.15.3 |
| INC-S4-C | Tooltip como componente React | Usar formatter/contentStyle primitivos |
| INC-S4-D | git status "nothing to commit" | Claude Code mostró código pero no editó disco → pedir que use herramientas Edit/Write |

---

## RUTA REAL DEL PROYECTO EN DISCO

```
~/proyectos/cafe-plus/          ← repo Git real
~/Desktop/Claude/Cafe-Plus/     ← carpeta iCloud (NO es el repo)
```

Siempre trabajar desde `~/proyectos/cafe-plus/`.

---

## SUBAGENTES — PARALELIZACIÓN DE TAREAS

Claude Code soporta subagentes desde v2.1.139+. Permiten correr tareas independientes
en paralelo, cada una con su propio contexto limpio. Para Café+, usar con criterio:
2-3 agentes en tareas independientes tiene sentido. Más de eso en un proyecto de este
tamaño consume tokens sin beneficio proporcional.

### Cuándo paralelizar (tareas de sesión 5)

| Tareas | ¿Paralelizar? | Razón |
|--------|--------------|-------|
| Tarea 2 (Clientes CRM) + Tarea 3 (hora pico) | ✅ Sí | Archivos distintos, independientes |
| Tarea 4 (Clerk) + cualquier otra | ✅ Sí | Rama separada, no toca main |
| Tarea 5 (README) + cualquier otra | ✅ Sí | Solo documentación |
| Bug fix que depende de ver el error | ❌ No | Requiere diagnóstico secuencial |

### Forma rápida — comando /batch

```
/batch Ejecuta estas dos tareas en paralelo:
1. Agrega campo notas, historial de pedidos y badge inactivo en Clientes.jsx
2. Agrega gráfica de hora pico en Analisis.jsx
Son independientes. Al terminar reporta los cambios de cada una.
```

### Forma avanzada — subagente especializado en YAML

Crear archivo `.claude/agents/frontend-cafe.yaml` en la raíz del repo:

```yaml
name: frontend-cafe
description: Especialista en componentes React + Tailwind para Café+
model: claude-sonnet-4-6
tools: [read, write, bash]
prompt: |
  Eres un especialista en React 18 + Vite + Tailwind CSS para el proyecto Café+.
  Paleta activa: Fresh Matcha (cafe-500=#2d6a4f, terracota-500=#1e6091).
  Tipografía: Plus Jakarta Sans (display) + Outfit (body).
  Reglas obligatorias:
  - Nunca usar formatFechaHora (no existe) → usar formatFecha
  - Nunca usar input-cafeteria → usar input-cafe o input-field
  - Dark mode en todos los elementos nuevos
  - fetch nativo sin headers en POST a GAS y n8n
  - recharts@2.15.3 — no actualizar a v3
  - npm run build antes de cualquier push
  Lee /mnt/skills/public/frontend-design/SKILL.md antes de crear UI nueva.
```

Invocar con `@frontend-cafe` en el chat de Claude Code.

### Prompt de inicio de sesión con paralelización

```
Lee el CLAUDE.md. Usa /batch para Tarea 2 y Tarea 3 en paralelo.
Son independientes — Clientes.jsx y Analisis.jsx no se tocan entre sí.
Tarea 4 (Clerk) después, en rama feat/clerk-auth como sesión individual.
```

---

## OPTIMIZACIÓN DE TOKENS EN CLAUDE CODE

### Estrategias actuales (ya aplicadas)
- **CLAUDE.md** en la raíz → evita que Claude redescubra el proyecto cada sesión
- **Skills routing** → leer solo la skill relevante por tarea, no todas
- **`/compact`** → ejecutar manualmente cuando la sesión lleve 40-50% de contexto usado.
  Claude resume la conversación y reinicia la ventana sin perder el estado del trabajo.

### Graphify — alternativa si el proyecto crece significativamente
Si el proyecto supera ~50 archivos o las sesiones se vuelven lentas y costosas,
evaluar **Graphify**: pre-compila el codebase en un grafo de conocimiento que
Claude Code consulta en lugar de leer archivos uno por uno.

Instalación cuando se requiera:
```bash
pip install graphify
cd ~/proyectos/cafe-plus
graphify build   # genera el grafo una vez
# Claude Code lo usa automáticamente en sesiones siguientes
```

**Para el tamaño actual de Café+ (~15 archivos JSX) no es necesario.**
El CLAUDE.md y el `/compact` son suficientes.

---

## CREDENCIALES DE PRUEBA

```
Admin:  admin / admin123
Cajero: cajero1 / cajero123
```

---

## GSTACK — Skills para Cafe+ (Sesión 5)

Instalado en `.claude/skills/gstack/` (project-local). Telemetría OFF. Sin sync a Supabase.

| Skill | Cuándo usarlo en Cafe+ |
|-------|----------------------|
| `/office-hours` | Brainstorming de nuevas features antes de planificar |
| `/plan-eng-review` | Validar arquitectura antes de escribir código |
| `/design-review` | QA de componentes React + accesibilidad |
| `/qa` | Testing en navegador real (dark mode, mobile) |
| `/review` | Code review de PRs o diffs |

Verificar config: `./.claude/skills/gstack/bin/gstack-config list`

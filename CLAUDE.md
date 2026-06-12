# CLAUDE.md — Café Plus | Master
> Archivo consolidado. Actualizado: 2026-06-12
> Reemplaza: CLAUDE_S4.md, CLAUDE_S5.md, Avance_Perplexity.md
> Contiene: bases del proyecto + estado actual + historial bugs + tareas pendientes

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
| Backend GAS | https://script.google.com/macros/s/AKfycbw8sF-F3T0ftXO6BBqUwXB1yI6SZnAd0U7HAdw7fs5gI541jl6L4C37AJhjxMZMkyRt/exec |
| Spreadsheet ID | 1GdeZReoLbIhZc9kRGK7IjhsgaNds8O26uEGQVvY1dq4 |
| n8n base | https://appn8n-n8n.u555aa.easypanel.host |
| n8n webhook chat IA | https://appn8n-n8n.u555aa.easypanel.host/webhook/df19bf86-8f1a-46af-af4f-71a7a253fd24 |
| n8n workflow ID | chpLlo3iR6CM2Ja5 (Cafe_Plus) |
| EasyPanel VPS | http://89.116.167.180:3000 |

---

## STACK TÉCNICO

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React 18 + Vite + Tailwind CSS v3 | v4 evitado por CLI |
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

## ESTADO DE MODULOS — CIERRE SESION 6

| Archivo | Estado | Sesion |
|---------|--------|--------|
| Login.jsx | OK — Clerk SignIn + Fresh Matcha theme + dark mode | S6 |
| App.jsx | OK — BLOQUEADO no tocar rutas | S2 |
| Sidebar.jsx | OK — BLOQUEADO no tocar nav items | S2 |
| ThemeContext.jsx | OK dark mode completo | S2 |
| Layout.jsx | OK mobile responsive + header-glass + hamburguesa | S4 |
| index.css | OK glassmorphism + microanimaciones + stagger | S4 |
| tailwind.config.js | OK paleta Fresh Matcha + tipografia premium | S4 |
| api.js | OK Clerk auth + userCategoria + redirect:follow | S6 |
| AuthContext.jsx | OK Clerk useUser + cafe_user localStorage compat | S6 |
| src/lib/clerkTheme.js | OK tema Clerk con paleta Fresh Matcha | S6 |
| Usuarios.jsx | OK CRUD + table-wrapper mobile | S4 |
| Productos.jsx | OK CRUD + toggle + mobile + useAuth | S6 |
| Clientes.jsx | OK CRUD + badges + historial pedidos + notas | S5 |
| NuevoPedido.jsx | OK carrito + descuentos + mobile | S4 |
| PedidosHoy.jsx | OK kanban + autorefresh + ordenamiento | S4 |
| Historial.jsx | OK tabla paginada + filtros + PDF + sort + selector mes | S5 |
| Analisis.jsx | OK KPIs + BarChart + Treemap + LineChart + hora pico + chat IA | S5 — CORS n8n pendiente |

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

### BUG ACTIVO — CORS bloqueado en browser
El workflow procesa correctamente (confirmado via MCP n8n).
El browser bloquea la respuesta por falta de header Access-Control-Allow-Origin.

Fix pendiente en nodo Respond to Webhook -> Options -> Response Headers:
```
Access-Control-Allow-Origin: https://clawdbot-cafe-plus.u555aa.easypanel.host
Access-Control-Allow-Methods: POST, OPTIONS
Content-Type: application/json
```

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

## TAREAS PENDIENTES — SESION 7

| # | Tarea | Donde | Prioridad |
|---|-------|-------|-----------|
| 1 | CORS chat IA — headers en Respond to Webhook | n8n (no codigo) | ALTA |
| 2 | Remover console.log diagnóstico de Analisis.jsx | Analisis.jsx | MEDIA |
| 3 | FINDING-003 — Mobile sidebar overlay a 375px | Layout.jsx + Sidebar.jsx | MEDIA |
| 4 | Crear usuarios en Clerk dashboard (admin + cajero) | dashboard.clerk.com | ALTA |
| 5 | Configurar publicMetadata.categoria en Clerk | dashboard.clerk.com | ALTA |
| 6 | Memoria corta del agente (BA_MemoryEnvelope) | n8n workflow | BAJA |
| 7 | Alertas WhatsApp/email cuando falle flujo IA | n8n + Evolution API | BAJA |

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
  Especialista en React 18 + Vite + Tailwind CSS para Cafe+.
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

## CREDENCIALES DE PRUEBA

```
Admin:  admin / admin123
Cajero: cajero1 / cajero123
```

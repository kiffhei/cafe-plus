# Avance_Perplexity - Sesión 2026-06-04

## Contexto general
- Al Finalizar los créditos por horario de la membresía de claude, pase a perplexity y abrí un nuevo chat para seguir avanzando lateralmente en el proyecto.
- Proyecto: **Café+** — módulo `Análisis IA` en el dashboard de administración.  
- Stack relevante:
  - Frontend: React 18 + Vite + Tailwind, componente clave: `Analisis.jsx`. [file:211]
  - Backend datos: Google Apps Script + Google Sheets. [file:1]
  - IA: n8n con AI Agent + MCP server (consultas a Sheets).
  - Infra: EasyPanel (Docker) para n8n y frontend. [file:1]

Objetivo de la sesión:  
Dejar funcional el flujo de chat IA (`Agente IA — Análisis de ventas`) que conecta el frontend con n8n, corrigiendo CORS, contrato de respuesta y comportamiento del agente para el demo y portafolio. [file:1][file:211]

---

## Cambios en workflow de n8n (Cafe_Plus)

Workflow: **Cafe_Plus** (webhook de chat IA). [file:1]

### 1. Manejo de CORS y preflight OPTIONS

Situación inicial:
- El navegador bloqueaba el `fetch` hacia n8n por CORS.
- `N8N_CORS_ORIGIN` y similares **no aplican a webhooks** en este caso. [file:1]

Cambios aplicados:

1. **Webhook + Respond to Webhook**
   - Webhook configurado con `Respond to Webhook` como último nodo.
   - `Respond With`: **Text** (pero devolviendo JSON serializado).
   - Se agregó `Respond to Webhook` al final de la rama principal (POST) para enviar respuesta al frontend.

2. **Headers CORS en `Respond to Webhook`**
   - En el nodo final de respuesta del flujo principal (rama `false` del IF de preflight), se configuraron headers:
     - `Access-Control-Allow-Origin`: `https://clawdbot-cafe-plus.u555aa.easypanel.host`
     - `Access-Control-Allow-Methods`: `POST, OPTIONS`
     - (Pendiente recomendado: `Content-Type: application/json`). [file:1][file:253]

3. **Rama OPTIONS (preflight)**
   - IF inicial que evalúa si la petición es `OPTIONS`.
   - Rama `true`:
     - `Respond to Webhook` específico para preflight.
     - Response body de diagnóstico (JSON) con:
       - `source: "preflight-options"`
       - `cors_expected` (allowOrigin, allowMethods, allowHeaders)
       - `checks` (hasOriginHeader, originMatchesFrontend, etc.)
       - `hints` sobre siguiente POST esperado.  
     - Esto permite verificar en Network que el preflight entra al webhook correcto. [file:1]

Resultado:
- Preflight OPTIONS ya es manejado en una rama separada.
- El flujo principal se reserva para POST del chat IA.  

Pendiente:
- Confirmar en DevTools que el POST ya no es bloqueado (con `Content-Type` correcto) y que la respuesta llega con los headers CORS esperados. [file:253]

---

### 2. Nuevo nodo `BA_Envelope` (normalización de input)

Problema:
- El AI Agent recibía el objeto completo del request (body, headers, envelope), generando respuestas genéricas o no alineadas con la pregunta. [file:1][file:237]

Solución:
- Se diseñó un nodo `Code` llamado **`BA_Envelope`** para:
  - Parsear `body` del webhook.
  - Extraer la pregunta (`mensaje` / `pregunta` / `query`).
  - Extraer `periodo.desde` / `periodo.hasta` como `fecha_desde` / `fecha_hasta`.
  - Inferir una intención (`intent`) básica según la pregunta.
  - Sugerir tablas a consultar (`tablas_sugeridas`).
  - Dejar un payload compacto para el AI Agent. [file:1]

Código propuesto para `BA_Envelope`:

```javascript
const item = $input.first().json;

function safeParseBody(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

const body = safeParseBody(item.body);

const pregunta =
  body.mensaje?.trim() ||
  body.pregunta?.trim() ||
  body.query?.trim() ||
  '';

const fechaDesde =
  body.periodo?.desde ||
  body.fecha_desde ||
  null;

const fechaHasta =
  body.periodo?.hasta ||
  body.fecha_hasta ||
  null;

const usuario =
  body.usuario ||
  'Usuario dashboard';

const contexto =
  body.contexto ||
  'analisis_ventas';

function detectIntent(texto = '') {
  const t = texto.toLowerCase();

  if (/(canal|rappi|uber|didi|local)/.test(t)) return 'ventas_por_canal';
  if (/(ticket promedio|ticket medio|promedio por pedido)/.test(t)) return 'ticket_promedio';
  if (/(producto más vendido|producto mas vendido|producto top|más vendido|mas vendido)/.test(t)) return 'producto_top';
  if (/(stock|inventario|existencia|productos con stock bajo)/.test(t)) return 'stock_productos';
  if (/(cliente|visitas|cumpleaños|cumpleanos|descuento)/.test(t)) return 'clientes';
  if (/(cajero|usuario|administrador|rol)/.test(t)) return 'usuarios';
  if (/(pedido|pedidos|venta|ventas|ingreso|ingresos)/.test(t)) return 'ventas_general';

  return 'consulta_general';
}

function suggestTables(intent) {
  switch (intent) {
    case 'ventas_por_canal':
    case 'ticket_promedio':
    case 'ventas_general':
      return ['bd_ventas'];

    case 'producto_top':
      return ['bd_detalle_pedidos', 'bd_ventas'];

    case 'stock_productos':
      return ['bd_productos'];

    case 'clientes':
      return ['bd_clientes'];

    case 'usuarios':
      return ['bd_usuarios'];

    default:
      return ['bd_ventas'];
  }
}

const intent = detectIntent(pregunta);
const tablasSugeridas = suggestTables(intent);

return [
  {
    json: {
      ok: true,
      pregunta,
      intent,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      usuario,
      contexto,
      tablas_sugeridas: tablasSugeridas,
      tablas_disponibles: [
        'bd_ventas',
        'bd_detalle_pedidos',
        'bd_productos',
        'bd_clientes',
        'bd_usuarios'
      ],
      reglas: {
        usar_solo_datos_reales: true,
        no_inventar: true,
        moneda: 'MXN',
        respuesta_max_parrafos: 4
      }
    }
  }
];
```

Estado:
- Este nodo ya estructura el input que entra al AI Agent como se observa en la captura (`pregunta`, `intent`, `tablas_sugeridas`, etc.). [file:252][file:253]

---

### 3. Prompt optimizado del AI Agent

Problema inicial:
- El agente devolvía mensajes genéricos (“Ya tengo la información...”) sin usar correctamente las tools ni responder a la pregunta del usuario. [file:1]

Cambios:
- Se reemplazó el prompt del AI Agent por uno **operacional**, con:
  - Protocolo obligatorio de uso de tools.
  - Reglas de enrutamiento por tipo de pregunta.
  - Definición clara de qué contiene cada tabla.
  - Prohibición explícita de respuestas genéricas. [file:237]

Resumen del nuevo prompt:

- Usar EXCLUSIVAMENTE datos reales vía tools.
- Consultar al menos una tool antes de responder.
- Responder solo a la pregunta actual.
- Prohibido responder con plantillas genéricas tipo:
  - “Ya tengo la información...”
  - “Puedo ayudarte...”
  - “Dime qué análisis deseas...”
- Si no hay datos, responder exactamente:
  - `"No tengo ese dato en la base de datos actual."`
- Usar siempre MXN con formato `$0.00`.
- Máximo 4 párrafos, español mexicano, directo.
- Tablas:
  - `bd_ventas`: ventas, pedidos, canales, ticket promedio, cajero, estado.
  - `bd_detalle_pedidos`: producto más vendido, cantidades por producto, detalle de líneas.
  - `bd_productos`: catálogo, categorías, precios, costos, stock.
  - `bd_clientes`: visitas, descuentos, datos de cliente.
  - `bd_usuarios`: nombre y rol (nunca contraseñas).
- Reglas de enrutamiento:
  - Canal / ventas / ticket / cajero → `bd_ventas`.
  - Producto top → `bd_detalle_pedidos` (+ `bd_ventas` si hace falta).
  - Stock / precios / catálogo → `bd_productos`.
  - Visitas / descuentos / cumpleaños → `bd_clientes`.
  - Roles / usuarios → `bd_usuarios`. [file:237]

Resultado:
- El agente **ya contesta correctamente y alineado a la pregunta**, por ejemplo dando el día con más ventas en un rango concreto, usando datos de `bd_ventas`. [file:253]

Pendiente:
- Ajustar todavía el contrato con el frontend (ver sección de pendientes).

---

### 4. Nodo de respuesta final a la app

Nodo: `Respond to Webhook` (rama principal, POST). [file:253]

Configuración clave:

- **Respond With**: `Text`
- **Response Body**:

  ```javascript
  {{
    JSON.stringify({
      respuesta:
        $json.respuesta ||
        $json.response ||
        $json.output ||
        $json.text ||
        'No pude generar una respuesta en este momento.'
    })
  }}
  ```

- **Response Headers**:
  - `Access-Control-Allow-Origin`: `https://clawdbot-cafe-plus.u555aa.easypanel.host`
  - `Access-Control-Allow-Methods`: `POST, OPTIONS`
  - (Recomendado) `Content-Type`: `application/json`

Output observado:
- Ejemplo:  

  ```json
  {
    "respuesta": "El día con más ventas entre el 1 de mayo y el 4 de junio de 2026 fue el 3 de junio de 2026, con múltiples pedidos registrados y ventas acumuladas superiores a los otros días en este rango."
  }
  ```  
  [file:253]

---

## Cambios / consideraciones en EasyPanel

- Confirmación de que:
  - Frontend productivo: `https://clawdbot-cafe-plus.u555aa.easypanel.host`. [file:1]
  - n8n: `https://appn8n-n8n.u555aa.easypanel.host`. [file:1]
- Variables relevantes:
  - `VITE_N8N_WEBHOOK` debe apuntar a la URL correcta del webhook de n8n (sin duplicados). [file:1]
- Incidencia previa:
  - `N8N_CORS_ORIGIN` y similares se confirmó que no solucionan CORS en webhooks; se optó por headers en `Respond to Webhook`. [file:1]

Pendiente:
- Verificar que en el servicio de n8n se haya eliminado cualquier variable duplicada de `VITE_N8N_WEBHOOK` o CORS que no se use (INC-S5-D en CLAUDE_S5). [file:1]

---

## Estado del frontend (`Analisis.jsx`)

Archivo: `src/pages/Analisis.jsx`. [file:211]

Puntos relevantes:

- `N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK`.
- Chat IA:
  - `enviarMensaje` hace `fetch(N8N_WEBHOOK, { method: 'POST', body: JSON.stringify({ mensaje, periodo, usuario, contexto }) })`.
  - `const data = await res.json()`.
  - Selección de respuesta:

    ```javascript
    const respuesta =
      data?.respuesta ??
      data?.output ??
      data?.text ??
      'No pude obtener una respuesta. Intenta de nuevo.';
    ```

- Mensaje de error actual en UI:
  - “No pude obtener una respuesta. Intenta de nuevo.”
- Esto indica que `data.respuesta` llega `undefined` o que el `fetch` está entrando al `catch` (por CORS, parseo o URL errónea). [file:211][file:252]

Acción recomendada (no implementada aún, quedó como siguiente paso):

1. Agregar logs de diagnóstico:

   ```javascript
   console.log('[IA] status:', res.status);
   console.log('[IA] ok:', res.ok);
   console.log('[IA] content-type:', res.headers.get('content-type'));

   const raw = await res.text();
   console.log('[IA] raw response:', raw);

   let data = null;
   try {
     data = JSON.parse(raw);
   } catch (parseErr) {
     console.error('[IA] JSON parse error:', parseErr);
   }

   console.log('[IA] parsed data:', data);
   ```

2. Confirmar que:
   - `raw` coincide con el JSON que devuelve n8n.
   - `parsed data` tiene `respuesta`.
   - En caso de array: leer `data[0].respuesta`.

---

## Incidencias y aprendizajes clave

Basado en `CLAUDE_S5.md` + sesión actual. [file:1][file:211]

### CORS y webhooks en n8n

- `N8N_CORS_ORIGIN` no aplica de forma fiable a webhooks → usar headers en `Respond to Webhook`. (INC-S5-B)
- Apps Script y n8n:
  - Usar siempre `fetch` nativo sin headers explícitos en POST (`Content-Type` lo maneja el endpoint). (INC-001)
- Preflight OPTIONS:
  - Es necesario manejar explícitamente la rama `OPTIONS` con un `Respond to Webhook` rápido.

### Contrato frontend–n8n

- El frontend espera un objeto JSON con `respuesta` / `output` / `text`. [file:211]
- n8n debe devolver exactamente ese shape (no arrays, no HTML).
- Cualquier cambio en el contrato debe reflejarse en `Analisis.jsx`.

### AI Agent + MCP

- El agente:
  - Debe recibir un input minimalista (`pregunta`, `intent`, `tablas_sugeridas`, fechas).
  - Debe tener reglas operacionales claras de uso de tools y tablas.
- Sin esto, aunque MCP funcione, el agente puede:
  - Responder con plantillas genéricas.
  - Consultar tablas innecesarias.
  - No usar bien las tools.

---

## Pendientes concretos para la siguiente sesión (Claude)

1. **Frontend–n8n contrato final**
   - Agregar logs en `Analisis.jsx` para ver:
     - status, headers, raw response, parsed JSON.
   - Confirmar:
     - `VITE_N8N_WEBHOOK` apunta a la URL correcta.
     - `Respond to Webhook` incluye `Content-Type: application/json`.
   - Ajustar lógica del frontend si la respuesta es un array o un objeto anidado.

2. **Memoria corta del agente**
   - Diseñar `BA_MemoryEnvelope`:
     - guardar última `pregunta`, `intent`, `fecha_desde/hasta`, entidad clave.
     - TTL corto (10–20 min).
   - Enviar `historial_reciente` al AI Agent sin afectar la claridad de la pregunta actual.

3. **WhatsApp + correo (alertas técnicas)**
   - Integrar Evolution API (WhatsApp) para:
     - alertas cuando el flujo IA falle (CORS, error de fetch, respuesta vacía).
   - Configurar SMTP / webpass para:
     - correo técnico de errores graves del workflow.

4. **Refinamiento del prompt**
   - Añadir ejemplos específicos de:
     - “ventas por canal”
     - “producto más vendido”
     - “ticket promedio”
   - Definir cómo responder cuando las tablas estén vacías para el rango dado.

5. **Documentación y limpieza**
   - Remover `console.log` de diagnóstico usados para items, etc.
   - Actualizar README técnico con:
     - flujo completo del chat IA,
     - variables de entorno relacionadas (`VITE_N8N_WEBHOOK`, etc.),
     - dependencias de n8n/MCP.

---

## Prompt sugerido para retomar el caso en Claude

Usa este prompt al abrir sesión en Claude (Claude Code o estándar):

```text
Contexto:
Estoy trabajando en el proyecto Café+ (dashboard React + n8n + Google Apps Script + Sheets). Ya tengo un archivo llamado CLAUDE_S5.md y ahora añadí otro llamado Avance_Perplexity.md con el estado más reciente del módulo "Análisis IA" y del workflow de n8n Cafe_Plus.

Quiero que leas primero:
1) CLAUDE_S5.md
2) Avance_Perplexity.md

Objetivo:
Dejar completamente funcional el chat "Agente IA — Análisis de ventas" que vive en Analisis.jsx y se conecta a un webhook de n8n:

- Frontend: debe mostrar la respuesta del agente sin volver a ver el mensaje "No pude obtener una respuesta".
- n8n: ya tiene configurado BA_Envelope, AI Agent con prompt optimizado y Respond to Webhook con headers CORS y JSON.
- Backend: las tools MCP consultan tablas de Sheets (bd_ventas, bd_detalle_pedidos, bd_productos, bd_clientes, bd_usuarios).

Tareas que quiero que completes:
1) Revisar Analisis.jsx y agregar el logging propuesto para inspeccionar la respuesta real del webhook (status, raw response, parsed JSON).
2) Detectar por qué el frontend sigue mostrando el fallback "No pude obtener una respuesta" aunque Respond to Webhook ya devuelve { "respuesta": "..." }.
3) Ajustar Analisis.jsx para:
   - manejar correctamente la respuesta (objeto o array),
   - mostrar el texto del agente en el chat,
   - mantener el manejo de errores claro y minimalista.
4) Verificar que VITE_N8N_WEBHOOK apunte a la URL correcta y que no haya duplicados o inconsistencias como las descritas en CLAUDE_S5 (INC-S5-D).
5) Opcional: diseñar un pequeño BA_MemoryEnvelope (en n8n) o lógica ligera de memoria en frontend para admitir seguimiento de contexto corto en las preguntas.

Instrucciones de estilo:
- No rompas las convenciones definidas en CLAUDE_S5.md (naming, Tailwind, recharts, fetch nativo, etc.).
- Antes de editar, explícame en pocas líneas el plan concreto de cambios.
- Al terminar, resume los cambios aplicados y cualquier TODO adicional que recomiendes.

Cuando estés listo, dime qué archivos necesitas que te comparta o asume que ya puedes leer Analisis.jsx, CLAUDE_S5.md y Avance_Perplexity.md en el repo del proyecto.
```

Con ese prompt Claude debera continuar donde dejamos, respetando las reglas del proyecto y enfocándose en cerrar el loop frontend–n8n y la parte de memoria/alertas.
# Café+ — Sistema de Gestión Operativa

[![CI](https://github.com/kiffhei/cafe-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/kiffhei/cafe-plus/actions/workflows/ci.yml)

> Sistema de gestión operativa y CRM con IA integrada para cafetería.
> Motor de temas dinámicos (7 paletas en runtime), fondo WebGL animado,
> backend serverless en Google Sheets + GAS sin costo de servidor de DB.
> Autenticación con Clerk, agente IA con n8n + OpenAI, deploy Docker en VPS.

Dev: Brian Anaya ([@kiffhei](https://github.com/kiffhei)) | Portafolio público.

**Producción:** https://clawdbot-cafe-plus.u555aa.easypanel.host

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19.2 + Vite 8 + Tailwind CSS v3 + react-router-dom 7 |
| Auth | Clerk (ClerkProvider + useUser + publicMetadata) |
| Backend | Google Apps Script REST API v1.5 |
| Base de datos | Google Sheets (5 hojas) |
| IA | n8n + OpenAI (workflow Cafe_Plus) |
| PDF | jsPDF |
| Gráficas | recharts 2.15.3 |
| Temas | 7 paletas CSS variables | data-theme en html, ThemeContext.jsx, selector en Sidebar |
| Deploy | Docker multistage en EasyPanel (autodeploy en push a `main`) |

---

## Módulos implementados

| Módulo | Descripción |
|--------|-------------|
| Login | Clerk SignIn con tema Fresh Matcha |
| Nuevo Pedido | Carrito, búsqueda, imágenes Unsplash por producto (EXACT_MATCH), descuentos, canal delivery |
| Pedidos Hoy | Kanban por estado, autorefresh cada 30s |
| Historial | Tabla paginada, filtros, export PDF |
| Clientes | CRUD, programa de lealtad, historial de visitas, notas |
| Productos | CRUD, toggle activo/inactivo, cálculo de margen |
| Usuarios | CRUD admin, control de roles (admin/cajero) |
| Análisis | KPIs, BarChart canales, Treemap, LineChart tendencia, chat IA |

Componentes transversales: `ShaderBackground` (fondo WebGL), `AISidebar` (chat IA flotante en Análisis e Historial), 7 temas dinámicos vía CSS variables.

### Estado del build

![CI](https://github.com/kiffhei/cafe-plus/actions/workflows/ci.yml/badge.svg)

- `npm run build` ✓ · `npm run lint` → 0 errores (9 warnings de idioms de framework, documentados).
- `npm test` → **20 tests** en lógica de negocio pura (`productImages`, `descuentos`).
- **Deuda conocida:** bundle principal ~676 KB sin code-splitting (no viable en Vite 8/rolldown). Tests cubren lógica pura; cobertura de componentes/páginas pendiente.

---

## Variables de entorno

Crear `.env` en la raíz (nunca commitear — está en `.gitignore`):

```env
VITE_API_URL=https://script.google.com/macros/s/<deployment-id>/exec
VITE_N8N_WEBHOOK=https://<n8n-host>/webhook/<webhook-id>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<clerk-key>
```

Para producción, configurar las mismas variables en EasyPanel → Environment antes de redesplegar.

---

## Deploy local

```bash
# Clonar
git clone https://github.com/kiffhei/cafe-plus.git
cd cafe-plus

# Instalar dependencias
npm install

# Crear .env con las variables de entorno (ver sección anterior)

# Dev server
npm run dev       # http://localhost:5173

# Build de producción
npm run build
```

---

## Notas técnicas críticas

### GAS — cada deploy genera URL nueva
```
NUNCA editar una implementación existente de GAS.
SIEMPRE: Nueva implementación → Web app → Execute as: Me → Anyone.
Actualizar VITE_API_URL en .env y en EasyPanel tras cada deploy de GAS.
```

### GAS — parámetro userCategoria
El param `categoria` está reservado en GAS como filtro de categoría de producto.
Para enviar el rol del usuario usar `userCategoria` (ya implementado en `api.js`).

### CORS con Google Apps Script
```js
// CORRECTO — fetch nativo sin headers extra
fetch(URL, { method: 'POST', body: JSON.stringify(data), redirect: 'follow' })

// INCORRECTO — axios o Content-Type explícito dispara preflight que GAS no maneja
```

### recharts
Usar `recharts@2.15.3` — la v3 es incompatible con Vite 8 rolldown (tree-shaking de exports memo).

### Dark mode
Todos los componentes nuevos deben incluir clases `dark:` de Tailwind.
`ThemeContext.jsx` controla la clase `dark` en `<html>`.

### Roles con Clerk
El rol se lee de `publicMetadata.categoria` en el dashboard de Clerk.
Sin configurar: todos los usuarios caen a `'cajero'` por defecto.

---

## Estructura de Google Sheets

| Hoja | Propósito |
|------|-----------|
| `bd_usuarios` | Usuarios del sistema (referencia legacy — auth migrada a Clerk) |
| `bd_productos` | Catálogo de productos con precios y stock |
| `bd_clientes` | CRM de clientes frecuentes y programa de lealtad |
| `bd_ventas` | Registro de pedidos |
| `bd_detalle_pedidos` | Líneas de detalle por pedido |

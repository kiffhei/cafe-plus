# DEV_TASKS.md — Café+ | Tareas de código/funcionalidad
> Para usar con: Claude Code (sesión dedicada).
> Fecha: 2026-06-17

---

## Contexto del proyecto

Café+ es un sistema de gestión operativa + CRM para cafetería en producción.
Stack: React 19.2 + Vite 8 + Tailwind CSS v3 + Clerk auth + GAS backend + n8n IA.
Repo: https://github.com/kiffhei/cafe-plus
Producción: https://clawdbot-cafe-plus.u555aa.easypanel.net
Ruta local: `~/proyectos/cafe-plus/`

Reglas críticas:
- `fetch` nativo sin headers en calls a GAS (evita CORS preflight)
- `recharts@2.15.3` — no actualizar
- `npm run build && npm run lint && npm test:run` antes de cualquier push
- No tocar `App.jsx` ni `Sidebar.jsx`

---

## DEV1 · Mover API key a variable de entorno `[XS]` — CRÍTICO

**Archivo:** `src/api/api.js`

**Problema:** `'CAFEPLUS_2026_SECURE'` está hardcodeado en dos lugares (líneas 38 y 48).
Esto es visible en el repo público y en el bundle de producción.

**Cambios exactos:**
1. En `src/api/api.js`, línea 38:
   ```js
   // ANTES:
   url.searchParams.set('apiKey', 'CAFEPLUS_2026_SECURE')
   // DESPUÉS:
   url.searchParams.set('apiKey', import.meta.env.VITE_GAS_API_KEY)
   ```
2. En `src/api/api.js`, línea 48:
   ```js
   // ANTES:
   const url = `${BASE}?action=${action}&apiKey=CAFEPLUS_2026_SECURE`
   // DESPUÉS:
   const url = `${BASE}?action=${action}&apiKey=${import.meta.env.VITE_GAS_API_KEY}`
   ```
3. En `apiPost` body (línea ~52):
   ```js
   // ANTES:
   apiKey: 'CAFEPLUS_2026_SECURE',
   // DESPUÉS:
   apiKey: import.meta.env.VITE_GAS_API_KEY,
   ```
4. Agregar `VITE_GAS_API_KEY=CAFEPLUS_2026_SECURE` al `.env` local
5. Agregar a EasyPanel → Environment
6. Verificar que build sigue funcionando: `npm run build`

---

## DEV2 · Crear `.env.example` `[XS]` — CRÍTICO

**Archivo nuevo:** `.env.example` en la raíz del proyecto.

Contenido exacto:
```
# Café+ — Variables de entorno necesarias
# Copiar este archivo como .env y rellenar con los valores reales

# URL del Google Apps Script desplegado (Nueva implementación → Web app)
VITE_API_URL=

# URL del webhook de n8n para el chat IA
VITE_N8N_WEBHOOK=

# Publishable key de Clerk (obtener en clerk.com → tu app → API Keys)
VITE_CLERK_PUBLISHABLE_KEY=

# API key para autenticar requests al GAS
VITE_GAS_API_KEY=

# Activar logs de diagnóstico del chat IA (solo desarrollo)
VITE_DEBUG_IA=false
```

---

## DEV3 · Eliminar código muerto en `api.js` `[XS]`

**Archivo:** `src/api/api.js`

Eliminar el objeto `agente` completo (lines 108-123 aproximadamente):
```js
// ELIMINAR — AISidebar.jsx hace su propio fetch directamente, este export no se usa
export const agente = {
  analizar: (payload) => ...,
  chat: (mensaje, contexto) => ...,
}
```

Verificar con grep antes de eliminar: `grep -rn "agente\." src/ --include="*.jsx"` — si hay 0 usos en JSX, eliminar.

Dejar `auth.login` pero agregar comentario de 1 línea:
```js
// legacy — auth migrada a Clerk; mantener para compatibilidad con GAS si se necesita
```

---

## DEV4 · Actualizar `package.json` versión y README `[XS]`

1. En `package.json`: cambiar `"version": "0.0.1"` → `"version": "1.0.0"`

2. En `README.md`, sección "Estado del build":
   ```md
   // ANTES:
   **Deuda conocida:** sin tests automatizados (0% cobertura)
   // DESPUÉS:
   **Tests:** 20 tests con vitest — lógica de negocio (descuentos + productImages). Cobertura de páginas y flujos pendiente.
   ```

---

## DEV5 · Sacar CLAUDE.md y DESIGNER.md del repo público `[S]` — CRÍTICO

**Problema:** contienen credenciales de prueba, historial de sesiones internas y notas privadas. En un repo público esto es una mala práctica de seguridad visible.

**Pasos:**
```bash
# Agregar a .gitignore
echo "CLAUDE.md" >> .gitignore
echo "DESIGNER.md" >> .gitignore

# Sacar del índice de git (mantenerlos en disco)
git rm --cached CLAUDE.md DESIGNER.md

# Commit
git add .gitignore
git commit -m "security: remove internal session files from public tracking"
```

**Alternativa si quieres mantener documentación visible para reclutadores:**
- Crear `CLAUDE.md` "cara pública" con solo: descripción del proyecto, stack, cómo contribuir, variables de entorno
- Renombrar el CLAUDE.md actual a `CLAUDE.internal.md` y agregarlo a `.gitignore`
- Crear `DESIGNER.md` "cara pública" con: paleta de colores, tipografía, componentes (sin credenciales ni historial)

---

## DEV6 · GitHub Actions CI básico `[M]`

**Archivo nuevo:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_N8N_WEBHOOK: ${{ secrets.VITE_N8N_WEBHOOK }}
          VITE_GAS_API_KEY: ${{ secrets.VITE_GAS_API_KEY }}
```

Agregar badge al README:
```md
[![CI](https://github.com/kiffhei/cafe-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/kiffhei/cafe-plus/actions/workflows/ci.yml)
```

Agregar los 4 secrets en GitHub → Settings → Secrets and variables → Actions.

---

## DEV7 · Badges de categoría dinámicos `[S]`

**Archivo:** `src/api/api.js`

Agregar función `categoriaBadge` análoga a `canalBadge`:

```js
export function categoriaBadge(cat) {
  const norm = (s) => (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
  const map = {
    'cafe':        { label: 'Café',         cls: 'badge-cat-cafe' },
    'bebidas':     { label: 'Bebidas Frías', cls: 'badge-cat-bebidas' },
    'pasteleria':  { label: 'Pastelería',   cls: 'badge-cat-pasteleria' },
    'sandwich':    { label: 'Sándwich',     cls: 'badge-cat-sandwich' },
    'extras':      { label: 'Extras',       cls: 'badge-cat-extras' },
  }
  return map[norm(cat)] || { label: cat, cls: 'badge-cat-default' }
}
```

Actualizar `Productos.jsx` e `Historial.jsx` para usar `categoriaBadge(producto.categoria)` en lugar del badge hardcodeado.

Agregar las clases CSS en `index.css` (en la sección de badges, junto a `badge-canal-*` y `badge-estado-*`). Colores: coordinar con DESIGN_TASKS.md DT2.

---

## Orden recomendado

1. **DEV1 + DEV2 + DEV3 + DEV4** — una sola sesión, ~45 min. Cambios de seguridad y limpieza.
2. **DEV5** — decisión previa de Brian, luego 5 min de ejecución.
3. **DEV6** — sesión separada de 30 min para CI.
4. **DEV7** — coordinar con sesión de diseño (DESIGN_TASKS.md DT2).

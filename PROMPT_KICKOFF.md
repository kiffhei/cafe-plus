# PROMPT_KICKOFF.md — Café+ | Prompts de inicio para sesiones dedicadas
> Generado: 2026-06-17 · Auditoría completa en AUDIT.md · Plan en PLAN.md

> **✅ KICKOFF A, B y C ejecutados** (DEV1-DEV7, DT1-DT5 — ver `DEV_TASKS.md`/`DESIGN_TASKS.md`).
> Quedan como referencia de formato. **KICKOFF D (nuevo, 2026-07-22)** al final del archivo es
> el único con trabajo pendiente activo — no es de código, es de acción manual de Brian.

---

## KICKOFF A — Sesión Claude Code (seguridad + limpieza) `[45-60 min]`

**Copiar y pegar esto en una sesión nueva de Claude Code:**

```
Proyecto: Café+ — sistema de gestión operativa + CRM para cafetería.
Ruta local: ~/proyectos/cafe-plus/
Repo público: https://github.com/kiffhei/cafe-plus
Producción: https://clawdbot-cafe-plus.u555aa.easypanel.host

Lee CLAUDE.md para contexto técnico completo antes de tocar cualquier archivo.

Esta sesión es de SEGURIDAD y LIMPIEZA. No hay nueva funcionalidad. Cada cambio
debe ser quirúrgico — solo las líneas que afectan directamente la tarea.

TAREAS (en orden, una por una, con verificación entre cada una):

1. [DEV1] Mover API key a variable de entorno
   - src/api/api.js: reemplazar 'CAFEPLUS_2026_SECURE' (aparece 3 veces) por import.meta.env.VITE_GAS_API_KEY
   - Agregar VITE_GAS_API_KEY=CAFEPLUS_2026_SECURE al .env local
   - Verificar: npm run build (debe pasar sin errores)

2. [DEV2] Crear .env.example
   - Archivo nuevo en raíz con las 5 variables (ver DEV_TASKS.md DEV2 para contenido exacto)

3. [DEV3] Eliminar código muerto en api.js
   - Verificar primero: grep -rn "agente\." src/ --include="*.jsx"
   - Si 0 usos: eliminar el objeto agente completo
   - Agregar comentario a auth.login indicando que es legacy

4. [DEV4] Actualizar package.json y README
   - package.json: version "0.0.1" → "1.0.0"
   - README.md: corregir la afirmación de "0% cobertura de tests"

5. Verificación final antes de commit:
   npm run build && npm run lint && npm run test:run
   Los 3 deben pasar. Reportar resultados con números exactos (ej: "20/20 tests, 0 errores lint, build 2.8s")

6. Commit y push:
   git add src/api/api.js .env.example README.md package.json
   git commit -m "security: move API key to env var, add .env.example, cleanup dead code"
   git push

NO tocar App.jsx, Sidebar.jsx ni index.css.
NO agregar funcionalidades nuevas.
Leer DEV_TASKS.md para detalles exactos de cada cambio.
```

---

## KICKOFF B — Sesión Claude Code (CI + badges categoría) `[60 min]`

```
Proyecto: Café+ — sistema de gestión operativa + CRM.
Ruta local: ~/proyectos/cafe-plus/
Lee CLAUDE.md antes de tocar cualquier archivo.
Asume que DEV1-DEV4 del KICKOFF A ya están hechos.

TAREAS:

1. [DEV6] GitHub Actions CI
   - Crear .github/workflows/ci.yml (ver DEV_TASKS.md DEV6 para contenido exacto)
   - Agregar badge de CI al README.md
   - NO subir los secrets — explicar a Brian cómo agregarlos manualmente en GitHub Settings

2. [DEV7] Badges de categoría dinámicos
   - Agregar categoriaBadge() a src/api/api.js (ver DEV_TASKS.md DEV7)
   - Actualizar Productos.jsx e Historial.jsx para usar la nueva función
   - COORDINAR con sesión de diseño para los estilos CSS de badge-cat-* antes de implementar,
     o usar estilos temporales neutros y dejar un TODO visible para el diseño

Verificación antes de commit:
npm run build && npm run lint && npm run test:run
```

---

## KICKOFF C — Sesión Claude Design (diseño gráfico) `[90-120 min]`

```
Proyecto: Café+ — sistema de gestión operativa + CRM para cafetería.
App en producción: https://clawdbot-cafe-plus.u555aa.easypanel.host
Lee DESIGNER.md y CLAUDE.md antes de empezar.
También revisar DESIGN_TASKS.md para el alcance completo de esta sesión.

Esta sesión es EXCLUSIVAMENTE de diseño gráfico y QA visual.

PRIORIDADES:

1. [DT1] QA visual de light mode — 7 temas (ALTA)
   La app necesitar estar corriendo. Brian maneja el login de Clerk.
   Recorrer los 7 temas en modo LIGHT con ojos reales, no por cálculo.
   Corregir solo en index.css bajo html:not(.dark)[data-theme="X"].
   Regla: nunca oscurecer --cafe-accent global (rompe el sidebar oscuro).

2. [DT2] Badges de categoría — estilos CSS
   Diseñar y agregar las clases badge-cat-* en index.css.
   Coordinar con el código de DEV7 (la función categoriaBadge ya debe existir).

3. [DT3] Skeleton loaders (si queda tiempo)
   Ver DESIGN_TASKS.md DT3 para el patrón de implementación.

4. [DT5] Screenshots para README (si queda tiempo)
   Con la app corriendo, tomar screenshots de las pantallas más representativas.
   Guardar en /docs/screenshots/.

Reglas de theming que nunca romper:
- Nunca bg-cafe-700, bg-olivo-500, text-terracota-500, dark:bg-cafe-800
- Usar var(--cafe-*), .text-accent-theme, .tab-active-theme, .modal-surface, .label-muted
- Verificar SIEMPRE en tema terracota (el más saturado) en ambos modos
- npm run build + lint + test:run antes de cada push
```

---

## Nota sobre CLAUDE.md

Decidir antes de arrancar cualquier kickoff:
¿CLAUDE.md y DESIGNER.md van a quedar en el repo público o se sacan?

Si se sacan (recomendado por seguridad):
```bash
echo "CLAUDE.md" >> .gitignore && echo "DESIGNER.md" >> .gitignore
git rm --cached CLAUDE.md DESIGNER.md
git commit -m "security: remove internal docs from public tracking"
```

Si se quedan: al menos eliminar la sección de credenciales de prueba del CLAUDE.md
antes de mostrar el repo a reclutadores.

---

## KICKOFF D — Acción manual de Brian (Clerk + Apps Script) `[15-20 min]` — 2026-07-22

**No es una sesión de Claude Code — son pasos manuales que solo Brian puede hacer** (requieren
el dashboard de Clerk y el editor de Apps Script, fuera del alcance de una sesión de terminal).
Contexto completo: `pending-blockers.md` en la memoria del proyecto y `cierre.md`.

```
1. dashboard.clerk.com → API Keys → Secret keys → copiar CLERK_SECRET_KEY
2. Apps Script → Configuración del proyecto → Propiedades del script
   → agregar CLERK_SECRET_KEY (nunca en .env ni en el frontend)
3. Pegar el Codigo.gs nuevo (ya escrito en el repo) en el editor de Apps Script
4. Correr testClerkExchange() con un token real — confirmar que la respuesta
   trae el rol correcto antes de desplegar
5. Nueva implementación → Web app → Anyone → copiar la URL nueva
6. Actualizar VITE_API_URL en .env local y en EasyPanel → Environment
7. Smoke-test en producción: login admin y cajero, confirmar que cada uno
   ve/edita solo lo suyo y que un cajero ya NO puede escalar a admin
   falsificando userCategoria
8. Si algo falla: Apps Script → historial de implementaciones → volver a la
   anterior, y revertir el commit 908140b del frontend si hace falta
```

Cuando esto quede hecho, actualizar `pending-blockers.md` (memoria) y `DEV_TASKS.md` (DEV8 de
`[~]` a `[x]`).

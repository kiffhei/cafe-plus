# PLAN.md — Café+ | Plan de acción post-auditoría
> Prioridad: portafolio público. Criterio: convencer a reclutador que revisa repo en 5 min.
> Fecha: 2026-06-17

---

## CRÍTICO — Bloquea mostrar el proyecto

### C1 · Sacar CLAUDE.md del repo público `[S]`
**Problema:** CLAUDE.md contiene historial de sesiones, decisiones internas y credenciales de prueba en un repo público. Un reclutador que lo lee ve: "admin/admin123" y "cajero1/cajero123" en producción.
**Acción:**
1. Agregar `CLAUDE.md` y `DESIGNER.md` a `.gitignore`
2. Hacer `git rm --cached CLAUDE.md DESIGNER.md`
3. Commit: `security: remove internal session files from public repo`
4. Considerar moverlos a un branch privado `dev/internal` o a la wiki privada del repo

> Alternativa menos drástica si quieres mantener el historial visible: crear `CLAUDE.md` de "cara pública" (solo elevator pitch del stack + reglas de contribución) y renombrar el interno a `CLAUDE.internal.md` en `.gitignore`.

---

### C2 · Mover API key a variable de entorno `[XS]`
**Problema:** `'CAFEPLUS_2026_SECURE'` hardcodeado en `api.js` (líneas 38, 48). Aparece en el source del repo público y en el bundle de producción.
**Acción:**
1. En `api.js`, reemplazar la string por `import.meta.env.VITE_GAS_API_KEY`
2. Agregar `VITE_GAS_API_KEY=CAFEPLUS_2026_SECURE` a `.env` (local) y a EasyPanel
3. Documentar en `.env.example`

---

### C3 · Crear `.env.example` `[XS]`
**Problema:** quien clone el repo no sabe qué configurar.
**Acción:** crear archivo con las 4 variables necesarias (sin valores reales):
```
VITE_API_URL=
VITE_N8N_WEBHOOK=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_GAS_API_KEY=
VITE_DEBUG_IA=false
```

---

### C4 · Actualizar README — sección de estado del build `[XS]`
**Problema:** README dice "sin tests automatizados (0% cobertura)" cuando hay 20 tests.
**Acción:** actualizar esa línea a "20 tests con vitest (lógica de negocio: descuentos + productImages)".

---

### C5 · Agregar capturas de pantalla al README `[S]`
**Problema:** reclutador tiene que visitar la URL o clonar el repo para ver la UI. Sin visual = proyecto invisible en GitHub.
**Acción:**
1. Tomar screenshots de: Login, NuevoPedido, PedidosHoy (kanban), Historial, Análisis, y el selector de temas
2. Crear `/docs/screenshots/` con las imágenes (o subir a GitHub Issues y copiar las URLs)
3. Agregar sección "Screenshots" al README antes de la sección de Stack

---

## IMPORTANTE — Mejora sustancial de percepción

### I1 · Eliminar código muerto en `api.js` `[XS]`
- Eliminar objeto `agente` (analizar + chat) — dead code, AISidebar no lo usa
- Eliminar o comentar prominentemente `auth.login` — auth migró a Clerk
Razón: un reclutador que lee el archivo ve exports inconsistentes.

### I2 · Bumpar versión en `package.json` `[XS]`
`"version": "0.0.1"` → `"version": "1.0.0"` (o `"0.9.0"` si prefieres marcar como beta).
Un reclutador que ve 0.0.1 asume que es un proyecto inicial, no uno con 9 sesiones de trabajo.

### I3 · QA visual de light mode en los 7 temas `[M]`
El contraste AA está hecho por cálculo pero no verificado visualmente.
Requiere la app corriendo con acceso a Clerk. Ver DESIGN_TASKS.md para el alcance completo.

### I4 · Badges de categoría dinámicos `[S]`
Productos e Historial tienen badges hardcodeados en verde. Implementar `categoriaBadge(cat)` en `api.js` (análogo a `canalBadge`).

### I5 · Corregir doc drift en CLAUDE.md `[XS]`
- CLAUDE.md línea dice `formatFechaHora` no existe → en realidad SÍ existe en `api.js` l.138
- Si CLAUDE.md va a quedar en el repo (ver C1), actualizar esta referencia

### I6 · GitHub Actions básico (CI) `[M]`
Un workflow `.github/workflows/ci.yml` que corra `npm run lint` y `npm test:run` en cada PR.
Badge de CI en README = señal inmediata de que el proyecto tiene cultura de calidad.
Stack: ubuntu + node 20 + npm ci + vitest run.

---

## NICE-TO-HAVE — Pulido final

### N1 · Skeleton loaders en lugar de spinners `[M]`
Visualmente más premium. Ver DESIGN_TASKS.md.

### N2 · Empty states ilustrados `[M]`
Mensajes "No hay clientes aún" con ilustración simple. Ver DESIGN_TASKS.md.

### N3 · Separar Analisis.jsx (776 líneas) `[M]`
Extraer: `AnalisisKPIs.jsx`, `AnalisisCharts.jsx`, `AnalisisIA.jsx`.
No bloquea portafolio pero mejora mantenibilidad visible en el code review.

### N4 · Ampliar cobertura de tests `[L]`
Tests de integración para: crear pedido, aplicar descuento de cliente frecuente, flujo auth.
Actualmente solo 2 archivos de lógica pura tienen tests.

### N5 · Agregar GIF animado al README `[S]`
Un GIF de 10-15 segundos mostrando: login → crear pedido → kanban → chat IA → cambio de tema.
Tiene más impacto visual que 10 screenshots estáticos.

---

## Orden recomendado de ejecución

1. C2, C3, I1, I2 — todos son XS y se hacen en una sesión de 30 minutos (código)
2. C1 — decisión tuya sobre qué queda público; XS de ejecución, importante de pensar
3. C4 — 5 minutos
4. C5 o N5 — screenshots/GIF (requiere acceso visual a la app)
5. I3 — sesión dedicada de diseño (ver DESIGN_TASKS.md)
6. I4 — junto con I3 (código simple)
7. I6 — CI básico (30 min)
8. N1, N2 — sesión de diseño
9. N3, N4 — sesiones de refactor/testing separadas

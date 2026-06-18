# AUDIT.md — Café+
> Auditoría: 2026-06-17. Criterio: reclutador externo revisando repo en 5 minutos.

---

## 1. Funcionalidad — ¿corre end-to-end?

**BIEN:**
- Build funciona: `npm run build` ✓ (2.81s, 0 errores)
- Lint: 0 errores, 9 warnings (idioms de framework, documentados)
- Tests: 20/20 pasan (`vitest run`)
- App desplegada y accesible en producción: https://clawdbot-cafe-plus.u555aa.easypanel.host
- Autodeploy en push a `main` via EasyPanel
- CORS con n8n resuelto y verificado en vivo

**PROBLEMAS:**
- `agente.analizar` y `agente.chat` en `api.js` son código muerto — `AISidebar.jsx` NO los usa, hace su propio `fetch` directamente. Cualquier reclutador que lea `api.js` ve exports que no se usan y asume inconsistencia.
- `auth.login` en `api.js` es código muerto — auth migró a Clerk. Líneas 65–72 confunden al lector.
- Bundle principal 676KB sin code-splitting — el build mismo advierte `(!) Some chunks are larger than 500 kB`. No es bloqueante pero cualquier auditor de performance lo ve.

---

## 2. Seguridad — CRÍTICO

**BLOQUEANTE:**
- **API key hardcodeada en el bundle de producción.** `api.js` lines 38 y 48: `apiKey: 'CAFEPLUS_2026_SECURE'` aparece en texto plano en el bundle de producción, visible en browser DevTools → Network tab. Cualquiera puede llamar directamente al GAS con esa clave. Es frontend-only así que nunca será 100% secreta, pero `'CAFEPLUS_2026_SECURE'` en el source commiteado al repo público es un red flag inmediato para cualquier reclutador de seguridad.

**ALTO:**
- **Credenciales de prueba en CLAUDE.md (repo público).** `CLAUDE.md` está commiteado y contiene:
  ```
  Admin:  admin / admin123
  Cajero: cajero1 / cajero123
  ```
  Estas son credenciales de un sistema en producción (aunque Clerk sea el auth real, las credenciales de Google Sheets siguen siendo sensibles). Un reclutador que ve esto en un repo público descalifica inmediatamente el proyecto por mala práctica de seguridad.

**MEDIO:**
- No hay `.env.example` — quien clone el repo no sabe qué variables configurar sin leer toda la documentación. El README menciona las variables pero no provee un archivo de plantilla.

---

## 3. Calidad de código

**BIEN:**
- Separación clara entre páginas, componentes, contextos, lib y api
- CSS custom properties para theming — arquitectura correcta
- Immutabilidad respetada en los helpers de `descuentos.js` y `productImages.js`
- `fetchWithTimeout` con AbortController — manejo de errores correcto
- `formatFechaHora` existe en `api.js` (l.138) — útil, pero CLAUDE.md dice que NO existe. Doc drift activo.

**PROBLEMAS:**
- `Analisis.jsx`: 776 líneas. Está en el límite de 800. Un módulo que mezcla KPIs, 4 tipos de gráficas, chat IA y 7 paletas de colores hardcodeadas. Difícil de mantener.
- `Historial.jsx`: 629 líneas — cerca del límite.
- `version: "0.0.1"` — nunca actualizada. Para un reclutador es señal de que el proyecto es pre-alpha o que nadie lo mantiene.
- Objeto `agente` en `api.js` usa `headers: { 'Content-Type': 'application/json' }` — viola la regla CORS documentada en CLAUDE.md (y es dead code de todas formas).
- `import.meta.env.VITE_DEBUG_IA` declarado pero no documentado en `.env.example` ni en README — variable huérfana.

---

## 4. Tests

**BIEN:**
- vitest instalado, 20 tests verdes
- Tests de lógica pura bien estructurados (descuentos + productImages)

**PROBLEMAS:**
- Cobertura exclusivamente en 2 archivos de utilidad (lib/) — 0% en páginas, componentes, contextos, api calls
- Sin tests de integración para flujos críticos: crear pedido, aplicar descuento, chat IA
- Sin E2E (Playwright/Cypress/etc.) — el flujo completo "cajero crea pedido → aparece en PedidosHoy" no está automatizado
- README en su sección de build dice "sin tests automatizados (0% cobertura)" — afirmación desactualizada, hay 20 tests

---

## 5. Documentación

**BIEN:**
- README cubre stack, módulos, deploy, variables de entorno, notas técnicas críticas
- URL de producción visible en README
- CLAUDE.md y DESIGNER.md exhaustivos (buena práctica de proyecto)
- Historial de incidencias documentado en CLAUDE.md (INC-001 a INC-S8-E)

**PROBLEMAS:**
- Sin `.env.example` (mencionado en seguridad)
- Sin capturas de pantalla ni GIF en README — un reclutador tiene que clonar o visitar la URL para ver la UI
- Sin CI/CD badge (GitHub Actions / o similar) — el deploy es manual via git push
- README afirma "sin tests automatizados" cuando hay 20 tests — desactualizado
- `version: "0.0.1"` en package.json nunca bumpeada
- CLAUDE.md commiteado expone historial de sesiones, decisiones técnicas internas y credenciales — información que no debería estar en un repo público de portafolio

---

## 6. UI/UX

**BIEN:**
- Sistema de temas dinámicos (7 paletas) — diferenciador técnico real
- ShaderBackground WebGL — visualmente impresionante
- Glassmorphism consistente
- Contraste AA implementado en light mode (por cálculo)
- Dark mode en todos los módulos

**PROBLEMAS:**
- Contraste AA en light mode: está hecho por cálculo pero NO verificado visualmente (QA pendiente desde S9)
- Badges de categoría hardcodeados en verde en Productos e Historial
- Spinners en lugar de skeleton loaders — se ve menos premium
- Sin empty states ilustrados (0 clientes, 0 productos)
- Sin estados de error explícitos si el GAS falla — el usuario ve nada

---

## 7. ¿Qué tan lejos está de "listo para mostrar"?

**Veredicto:** 75% listo. La app funciona, corre en producción, tiene auth, temas dinámicos, IA integrada. Son features reales y diferenciadores. Lo que lo baja del 100%:
1. La API key hardcodeada en el source público es un red flag de seguridad que un reclutador técnico ve en 30 segundos.
2. CLAUDE.md en el repo público expone credenciales e historia interna.
3. Sin demo visual en README (screenshot / GIF).
4. Version `0.0.1` y README desactualizado en tests.

Estos 4 items son los que bloquean el "yes" de un reclutador que revisa el repo sin ver la app.

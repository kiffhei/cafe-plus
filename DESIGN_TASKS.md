# DESIGN_TASKS.md — Café+ | Tareas para sesión de diseño
> Para usar con: Claude Design (sesión dedicada) o open-design como herramienta de apoyo visual.
> Fecha: 2026-06-17

---

## Contexto del proyecto

Café+ es un sistema de gestión operativa + CRM para cafetería. Portafolio público de Brian Anaya.
Stack visual: React 19 + Tailwind CSS v3 + CSS custom properties. 7 temas dinámicos.
Estética: "Fresh Matcha" — glassmorphism + verde matcha + tipografía premium.
App en producción: https://clawdbot-cafe-plus.u555aa.easypanel.host

Reglas de diseño que NO se pueden romper (por compatibilidad con el sistema de temas):
- Nunca usar colores Tailwind hardcodeados como `bg-cafe-700`, `text-terracota-500`, `dark:bg-cafe-800`
- Siempre usar: `var(--cafe-*)`, `.text-accent-theme`, `.tab-active-theme`, `.modal-surface`, `.label-muted`
- Texto de acento sobre superficie CLARA → `var(--cafe-accent-ink, var(--cafe-accent))`
- Texto de acento sobre superficie OSCURA → `var(--cafe-accent)`
- Probar SIEMPRE el tema más saturado (terracota o pizarra) en ambos modos (light/dark)

---

## DT1 · QA visual de light mode — 7 temas `[ALTA]`

El contraste AA está calculado matemáticamente pero NO verificado con ojos.
El QA visual es obligatorio antes de declarar el light mode terminado.

**Cómo hacer el QA:**
1. Abrir la app con `npm run dev` (o usar producción)
2. Recorrer cada uno de los 7 temas (matcha, cafe-oscuro, medianoche, terracota, pizarra, vinyl-dark, vinyl-light) en modo LIGHT
3. En cada tema revisar:
   - Sidebar: textos secundarios (username, labels), íconos activos, selector de temas
   - Header: título del módulo, nombre de usuario
   - Tablas: headers (thead), celdas, badges de estado (pendiente/preparacion/entregado/cancelado)
   - KPI cards: valor numérico, label
   - Inputs: placeholder, texto al escribir, borde focus
   - Botones: primario, secundario
   - Modales: título, labels, inputs dentro del modal
   - Panel IA (AISidebar): nota — el sidebar IA es siempre oscuro incluso en light mode (es correcto)
   - Gráficas: ejes, labels, tooltip
   - Badges de canal (Local, Rappi, Uber Eats, DiDi Food)
4. Documentar y corregir en index.css bajo `html:not(.dark)[data-theme="X"]` sin tocar dark mode

**Atención especial:** el combo "sidebar oscuro + contenido claro" en los temas matcha y vinyl-light tiene el mayor riesgo de inconsistencia visual.

---

## DT2 · Badges de categoría dinámicos `[MEDIA]`

**Problema:** badges de categoría en Productos.jsx e Historial.jsx están hardcodeados con clase `bg-green-500` (o similar verde fijo). No respetan el sistema de temas.

**Diseño esperado:** análogo a `canalBadge` y `estadoBadge` en api.js.

**Categorías del catálogo:** Café, Bebidas Frías, Pastelería, Sándwich, Extras (verificar en GAS/Sheets).

**Paleta de badges por categoría (propuesta — ajustar según el tema Fresh Matcha):**
| Categoría | Color sugerido | Clase a crear |
|-----------|----------------|---------------|
| café | verde matcha | `badge-cat-cafe` |
| bebidas frías | azul | `badge-cat-bebidas` |
| pastelería | terracota/dorado | `badge-cat-pasteleria` |
| sándwich | ámbar | `badge-cat-sandwich` |
| extras | gris neutro | `badge-cat-extras` |

Los colores de los badges deben usar `--status-*-fg` pattern ya establecido en index.css para consistencia con el sistema de contraste AA ya implementado.

---

## DT3 · Skeleton loaders `[MEDIA]`

Reemplazar spinners de carga por skeleton loaders en todos los módulos con fetch.

**Módulos afectados:** Productos, Clientes, Historial, Análisis, PedidosHoy

**Patrón de implementación:**
```jsx
// Skeleton genérico para tabla
function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 rounded" style={{ background: 'var(--cafe-border)' }} />
          ))}
        </div>
      ))}
    </div>
  )
}
```

El color del skeleton debe usar `var(--cafe-border)` o `rgba(var(--cafe-accent-rgb), 0.1)` para respetar el sistema de temas. No usar `bg-gray-200` hardcodeado.

---

## DT4 · Empty states ilustrados `[BAJA]`

Cuando un módulo no tiene datos, mostrar un mensaje ilustrado en lugar de tabla vacía.

**Módulos y mensajes:**
- Productos: "No hay productos en el catálogo" — icono de caja/menú
- Clientes: "No hay clientes registrados aún" — icono de persona
- Historial: "No hay pedidos en este período" — icono de recibo
- PedidosHoy: "No hay pedidos activos hoy" — icono de café

**Implementación:** componente `EmptyState({ icon, title, subtitle })` en `src/components/ui/`.
El ícono puede ser un SVG simple inline o usar un emoji grande estilizado.
Usar tipografía del proyecto: Outfit para el texto, color `label-muted`.

---

## DT5 · Screenshots para README `[ALTA - impacto portafolio]`

Con la app corriendo, tomar capturas de las pantallas más representativas:

1. **Login** — pantalla Clerk con tema Fresh Matcha, modo dark
2. **Nuevo Pedido** — carrito con productos, imágenes, precio
3. **Pedidos Hoy** — kanban con pedidos en distintos estados
4. **Historial** — tabla paginada con filtros
5. **Análisis** — KPIs + gráficas + chat IA abierto
6. **Selector de temas** — panel con los 7 temas, en modo light y dark

Guardar en `/docs/screenshots/` con nombres descriptivos (ej. `analisis-dark-matcha.png`).
Resolución: 1440px de ancho mínimo. Formato PNG o WebP.

**Para el README:** 3-4 screenshots máximo (las más impactantes). No poner todas — menos es más.
Secuencia sugerida: Análisis (la más compleja) → Nuevo Pedido → Selector de temas.

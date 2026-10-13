# Fase 0 — Reconocimiento (sin cambios en datos)

Proyecto Supabase: `ffqjchbcjakvanhmrvly` (Coffee_Jazz). Único proyecto tocado.

## 1. Generador anterior de sintéticos

Vive **100% en Supabase**, no en el repo ni en n8n ni en Apps Script:

- Función `public.generar_pedido_sintetico()` (`SECURITY DEFINER`), migraciones `demo_sintetico_*`
  (2026-10-07). Inserta 1 pedido cada ejecución, `es_sintetico=true`, sin tocar `bd_productos`/`bd_clientes`.
- `pg_cron` job `demo_pedido_sintetico_20min`, `*/20 * * * *`, `active:true`. Corre 24/7 sin
  restricción de horario (de ahí el patrón uniforme todo el día que reporta la tarea).
- `grep -r "es_sintetico"` sobre todo el repo: **0 resultados**. El único workflow n8n existente
  (`My workflow 4`, recordatorio de aniversario) no toca `bd_ventas`.
- La app (`src/api/supabase.js`, `Historial.jsx`, `Analisis.jsx`, `AISidebar.jsx`) **no filtra
  `es_sintetico` en ninguna consulta** — ver sección 6.

No aplica la Regla 8(b) (no es código de producción app/n8n/GAS): se reemplaza directo en Fase 4.

## 2. Triggers, constraints, índices, RLS

- **Triggers: ninguno** en `bd_ventas` ni `bd_detalle_pedidos`. Nada bloquea un `UPDATE` de `fecha_hora`.
- Constraints: `bd_ventas_pkey(id_pedido)`, `bd_ventas_id_cliente_fkey`, `bd_detalle_pedidos_pkey(id)`,
  `bd_detalle_pedidos_id_pedido_fkey ON DELETE CASCADE`, `bd_detalle_pedidos_id_producto_fkey`,
  `bd_detalle_pedidos_cantidad_check (cantidad > 0)`. **Sin CHECK sobre `canal` ni `estado`**
  (se validan solo en la app).
- `canal` observado: `local`, `rappi`, `ubereats`, `didi`. `estado` observado: `entregado`, `cancelado`
  (no hay `pendiente` en los datos actuales).
- `id` de `bd_detalle_pedidos` es `GENERATED ALWAYS AS IDENTITY` (no serial clásico).
- RLS: `relrowsecurity=true` en las 5 tablas, `relforcerowsecurity=false` → el rol de servicio usado
  por las herramientas MCP/scripts bypassa RLS normalmente (dueño de tabla). Policies actuales:
  `SELECT` abierto a `authenticated`; `INSERT`/`UPDATE` en `bd_ventas`/`bd_detalle_pedidos` requieren
  `auth.jwt()->>'categoria' IN ('admin','cajero')` — irrelevante para scripts con rol de servicio.

## 3. Desfase de zona horaria — CONFIRMADO, causa raíz localizada

Hipótesis del enunciado confirmada con precisión quirúrgica.

- `hora_cdmx = fecha_hora AT TIME ZONE 'America/Mexico_City'` sobre `es_sintetico=false`: uniforme
  en horas 0–14 (2,412 filas) + pico en hora 23 (72 filas). Cero en 15–22.
- `hora_utc = extract(hour from fecha_hora)` (sin conversión): uniforme y **continua** de 5 a 20,
  con la hora 5 a la mitad de volumen (72, vs ~150-180 en el resto) — borde de ventana parcial.
  Las 72 filas de "hora 23 CDMX" son exactamente las de `hora_utc=5` vistas con el shift de -6h.
- **Causa raíz exacta**, en dos migraciones one-time (ya ejecutadas, no activas):
  - `seed_historico_2025_2026` (20261002162447): `v_fecha_hora := (v_date + v_hora)::timestamptz`
    donde `v_hora` es un intervalo de reloj local (5:30–21:00). Postgres interpreta el
    `timestamp` sin tz resultante usando el **timezone de sesión (UTC)**, no CDMX — la hora local
    queda grabada textualmente como si fuera UTC. Generó los 2,484 pedidos "reales" de ejemplo.
  - `fix_horario_operacion_ventas_existentes` (20261002162425, corrió segundos antes sobre un
    dataset previo menor): mismo patrón de cast sin `AT TIME ZONE`.
- No es un bug activo: ambas son migraciones `DO $$ ... $$` de una sola corrida, no funciones ni
  triggers. El generador sintético actual (`generar_pedido_sintetico()`) usa el default `now()` de
  la columna — correctamente timezone-aware, no tiene este bug (su problema es otro: sin ventana
  horaria, ver sección 1).
- **Fix propuesto** (no aplicado aquí; se ejecuta como parte de la Fase 2.3 `retime_pedidos.py`,
  que es precisamente el encargo): reasignar `fecha_hora` manteniendo la fecha lógica correcta.

### Regla de fecha lógica (confirmada, aplicada en Fase 2.3)

- `es_sintetico=false`: fecha lógica = **fecha UTC** de `fecha_hora` (recupera el día real de las
  72 filas que aparentan "23:00 del día anterior" en CDMX).
- `es_sintetico=true` (o si el desfase no aplicara): fecha lógica = fecha en `America/Mexico_City`.

## 4. Medidas de continuidad (histórico `es_sintetico=false`, 2,484 pedidos, excluye el lote 2026-10-06..12)

| Métrica | Valor |
|---|---|
| Ticket promedio (total, entregados) | $131.83 |
| Ticket promedio (subtotal, entregados) | $132.76 |
| Costo % ponderado por ingreso (catálogo) | 41.01% |
| % pedidos con descuento > 0 | 12.24% |
| Descuento % ponderado (Σdescuento/Σsubtotal) | 0.70% |
| % pedidos con cliente | 44.00% |
| Líneas por pedido | 2.0004 |
| Cancelación global | 1.29% (32/2,484) |
| Mix canal | local 55.3% (cancel 1.02%) · rappi 31.7% (0.63%) · ubereats 10.3% (2.72%) · didi 2.7% (9.09%, n=66, aplicar shrinkage) |

Validación cruzada con la Fase 1: estos valores producen equilibrio≈33.7/día y objetivo≈47.8/día,
dentro de ±1 del ~34/~48 de referencia del usuario — confirma que la medición es consistente.

## 5. Nota de datos — canal `didifood` vs `didi`

El código fuente de `seed_historico_2025_2026` usa el valor `'didifood'` en su array de canales,
pero el valor almacenado y vigente en todo `bd_ventas` es `'didi'`. No hay rastro de `'didifood'`
en los datos actuales — se corrigió en algún punto no capturado en las migraciones revisadas. No
requiere acción; el generador nuevo (Fase 4) usa `'didi'`, que es el valor real.

## 6. Filtrado de `es_sintetico` en la app / IA

**No existe.** `Historial.jsx`, `Analisis.jsx`, `PedidosHoy.jsx`, `Clientes.jsx` y el webhook de
`AISidebar.jsx` (vía n8n → Postgres node) leen `bd_ventas`/`bd_detalle_pedidos` sin filtro. Hoy no
importa (no hay ventas reales), pero el día que el negocio opere de verdad, todo lo sintético se
mezclaría con lo real en los reportes de la app.

**Propuesta** (no aplicada — fuera del alcance de Fase 0, se deja documentada para cuando el
negocio tenga ventas reales):

```sql
create view v_ventas_reales as select * from bd_ventas where es_sintetico = false;
create view v_detalle_reales as
  select d.* from bd_detalle_pedidos d join bd_ventas v using (id_pedido) where v.es_sintetico = false;
```

Cambiar la app para usarlas es trabajo de producción (`src/api/supabase.js`) — no se toca en esta
rama por la Regla 8(b); queda anotado aquí para cuando se decida.

---

## Plan (Fase 1 ya ejecutada, Fase 2 sigue)

1. ✅ Fase 0 cerrada — generador localizado (Supabase, no producción), desfase de TZ confirmado y
   explicado con causa raíz exacta, regla de fecha lógica definida, medidas de continuidad tomadas.
2. ✅ Fase 1 — `analytics/config.yaml` + `economia.py`: contribución 38.71% ($51.40/pedido),
   equilibrio 33.7/día, objetivo 47.8/día — a ±1 pedido del cálculo de referencia del usuario.
   Sensibilidad (ticket×comisión) en `analytics/out/economia.json`.
3. Fase 2.1 — `scripts/perfil.py`: pesos horarios, factor_dow, índice mensual, afinidades,
   Dirichlet por día, turnos. Única fuente de verdad para horario/afinidades.
4. Fase 2.2 — `analytics/eventos.yaml` + tabla `bd_eventos_locales`: cargar el calendario dado,
   verificar con WebSearch los `patron` marcados como "VERIFICAR" (2023/2024 Festejando Cuautitlán,
   fin de pista de hielo, fechas de tianguis temáticos) — presupuesto ~15 búsquedas.
5. Fase 2.3 — `scripts/retime_pedidos.py` con `--seed 42 [--apply] [--revert]`: backup
   `bd_ventas_retime_bak_YYYYMMDD` (2,901 filas esperadas), dry-run con histograma antes/después,
   luego `--apply` en transacciones por lotes.
6. Fase 3 — aceptación (pytest + SQL): horario, concentraciones, dispersión por día, coherencia de
   mix, md5 de columnas no tocadas, idempotencia de `--revert`.
7. Si Fase 3 falla dos veces seguidas → Regla 8(c), me detengo y pregunto.
8. Fases 4-7 siguen el orden del encargo (autogenerador → aceptación → análisis → dashboard).

Sigo con la Fase 2.1 (`scripts/perfil.py`) salvo que quieras revisar algo de lo anterior primero.

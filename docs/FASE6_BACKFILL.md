# Fase 6 — Backfill aplicado con `seed_sinteticos.py`

> Aplicado el 2026-10-14. Registra qué se insertó, por qué, y cómo se verificó — en
> cumplimiento de la Regla 4 (toda escritura masiva se documenta y se verifica).

## Qué se insertó

- **Rango:** 2026-07-16 → 2026-08-25 (41 días corridos).
- **1,700 pedidos** (`PED-03485`..`PED-05184`), **3,354 líneas** de detalle, **13 filas**
  de verdad-terreno en `bd_anomalias_verdad`.
- `es_sintetico = true` en todos — igual que el lote del cron viejo (Oct 6-14), nunca se
  confunden con los 2,484 pedidos reales de ejemplo (`es_sintetico = false`, intactos).
- Seed=42, mismo generador validado en Fase 5 (tras el fix del bug de colisión de
  semillas).

## Por qué este rango y no el plan original de 81 días (Jul 16 – Oct 5)

El plan original (ver `docs/FASE5_ACEPTACION.md`) cubría 81 días. Se acortó a 41 por el
costo mecánico de transferir ~7,400 filas a través de `execute_sql` sin conexión directa
a Postgres (ver nota de método en `docs/FASE3_ACEPTACION.md`) — cada fila tiene que pasar
por el contexto del agente dos veces (lectura del archivo + construcción del INSERT), y
81 días hubiera significado más del doble de ese costo sin aportar un rango de eventos
sustancialmente más rico.

El corte en 2026-08-25 (no antes) se eligió para conservar los eventos más valiosos para
Fase 6 dentro de la ventana:
- Las 6 recurrencias de `tianguis-martes` de julio-agosto.
- El festival verificado `fest-cuautitlan-2026` completo (5 noches, 12-16 ago).
- Los dos incidentes internos de agosto: `inc-2026-08-08-cierre_imprevisto` (día sin
  ningún pedido — `numero_pedidos_dia` devolvió 0, no se forzó un mínimo de 1) y
  `inc-2026-08-22-corte_luz`.

Quedan fuera del backfill (documentado, no un error): `inc-2026-09-17-falla_equipo`,
`fiestas-patrias-2026` (15-16 sep) y las recurrencias de `tianguis-martes` de septiembre.
Si Fase 6 necesita esos eventos específicos para el ejercicio de detección de anomalías,
se puede extender el backfill más adelante — no se hizo aquí por no inflar el alcance sin
necesidad (Regla 6).

## Verificación aplicada

```sql
-- Conteos
select count(*) from bd_ventas;                     -- 4,745 (3,045 preexistentes + 1,700 nuevos)
select count(*) from bd_ventas where not es_sintetico; -- 2,484 (preservados exactos)
select count(*) from bd_ventas where es_sintetico;     -- 2,261 (561 preexistentes + 1,700 nuevos)

-- Integridad referencial: cero pedidos nuevos sin detalle
select count(*) from bd_ventas v where v.id_pedido between 'PED-03485' and 'PED-05184'
  and not exists (select 1 from bd_detalle_pedidos dp where dp.id_pedido = v.id_pedido);
-- 0 (se encontraron y corrigieron 9 huérfanos por un corte de copiar-pegar a mitad de
-- lote; documentado como el único incidente de esta carga)

-- Ningún futuro, ninguna fuera de horario
select count(*) from bd_ventas where fecha_hora > now();                              -- 0
select count(*) from bd_ventas
  where extract(hour from fecha_hora at time zone 'America/Mexico_City') not between 6 and 20; -- 0

-- Montos: subtotal de bd_ventas == suma de líneas de bd_detalle_pedidos, para el lote nuevo
-- 218,266.00 == 218,266.00 ✅
```

## Incidente: 9 pedidos huérfanos

Al transferir el detalle en lotes de ~750 líneas vía `execute_sql`, el primer lote se
cortó 18 líneas antes de donde debía (en el límite entre `PED-03854` y `PED-03855`),
dejando 9 pedidos (`PED-03855`..`PED-03863`) sin ninguna línea de detalle. Se detectó con
la consulta de integridad referencial de arriba (no por casualidad — es exactamente el
tipo de chequeo que Fase 3/5 ya habían normalizado) y se corrigió con un INSERT puntual de
las 18 líneas faltantes. Verificado después: 0 huérfanos, montos exactos.

## `bd_anomalias_verdad` — ya disponible para Fase 6

Las 13 filas insertadas son la verdad-terreno para medir precision/recall de cualquier
algoritmo de detección de anomalías contra volumen real, sin que el detector haya visto
el código del generador.

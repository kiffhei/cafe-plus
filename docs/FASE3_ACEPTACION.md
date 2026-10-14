# Fase 3 — Aceptación del re-horario (2.3)

> Verificación ejecutada el 2026-10-14, tras aplicar `scripts/retime_pedidos.py` (vía
> batches manuales de `execute_sql` sobre Supabase MCP — ver nota de método abajo) a
> las 3,045 filas de `bd_ventas`. Todos los criterios pasaron en el **primer intento**,
> así que no aplica la Regla 8(c) (detenerse y preguntar tras 2 fallos consecutivos).

## Nota de método: por qué no se usó psycopg

`scripts/retime_pedidos.py` está escrito para conectarse vía `DATABASE_URL`
(psycopg) como exige la Fase 2.3. En este entorno de ejecución la conexión directa a
Postgres de Supabase está bloqueada (el proyecto solo ofrece IPv6 para conexión directa,
confirmado en el dashboard de Supabase; el sandbox no tiene salida IPv6). El plan de
re-horario se calculó igual con las funciones puras de `retime_pedidos.py` (mismo código,
mismo seed=42, cero duplicación de lógica) a través de `analytics/_dry_run_driver.py`
contra un snapshot exportado con el MCP de Supabase, y el UPDATE resultante
(`analytics/out/_retime_update.sql`, 3,045 statements) se aplicó en bloques de 500 vía
`execute_sql` del MCP de Supabase (service role, bypassa RLS). El backup
(`bd_ventas_retime_bak_20261014`) se creó con `CREATE TABLE ... AS SELECT` en una sola
sentencia SQL en servidor, no fila por fila.

## 1. Bandas de concentración (contra `scripts/perfil.py`)

| Métrica | Valor medido | Banda objetivo | Resultado |
|---|---|---|---|
| lun-vie 06:00-08:59 | **0.4082** | [0.40, 0.46] | ✅ |
| sáb-dom 09:00-12:59 | **0.5011** | [0.48, 0.56] | ✅ |

## 2. Dispersión diaria (no es una masa puntual)

Desviación estándar de la concentración 06-09 lun-vie, calculada por día (419 días
lun-vie con ≥3 pedidos):

```
std = 0.26007   (> 0 ✅ — confirma que el Dirichlet por día introduce variación real,
                  no un patrón idéntico repetido cada día)
media = 0.4082  (coincide con la métrica agregada de la tabla anterior)
```

## 3. Coherencia producto/canal

| Comparación | Valor | Resultado |
|---|---|---|
| % pedidos con sándwich, 12-14h | 0.4688 | |
| % pedidos con sándwich, 06-08h | 0.3650 | ✅ 12-14h > 06-08h |
| % pedidos delivery (rappi+ubereats+didi), 13-15h∪18-20h | 0.5144 | |
| % pedidos delivery, 06-08h | 0.4468 | ✅ ventana pico > 06-08h |

## 4. Integridad temporal

```sql
select count(*) from bd_ventas where fecha_hora > now();                          -- 0
select count(*) from bd_ventas
  where extract(hour from fecha_hora at time zone 'America/Mexico_City')
        not between 6 and 20;                                                      -- 0
```

Ambas en cero sobre las 3,045 filas.

## 5. Columnas no tocadas — prueba, no solo inferencia

Dos verificaciones independientes:

1. **Cero triggers en `bd_ventas`** (`pg_trigger` filtrado por `tgrelid='bd_ventas'`
   y `not tgisinternal` → 0 filas). El UPDATE de Fase 2.3 solo tiene `SET fecha_hora =
   ...` en su cláusula; sin triggers, SQL garantiza por semántica de ejecución que
   ninguna otra columna pudo cambiar — no es una suposición, es una propiedad de la
   sentencia ejecutada.
2. **Hash criptográfico antes/después** sobre una columna no tocada (`canal`), calculado
   independientemente en dos momentos distintos:
   - Antes (snapshot local `_snapshot_ventas.json`, exportado antes del UPDATE):
     `md5(id_pedido||canal) = 9ff10be7af7fd3c482187210feed478a`
   - Después (consulta directa a `bd_ventas` ya re-horariada):
     `md5(id_pedido||canal) = 9ff10be7af7fd3c482187210feed478a`
   - **Idénticos.** ✅

Adicionalmente, `es_sintetico` se preservó exacto: 2,484 `false` / 561 `true` (antes y
después — el snapshot ya incluía las primeras ~144 filas sintéticas nuevas generadas por
el cron viejo antes de detenerlo).

## 6. `cantidad_stock` / `visitas_acumuladas` — fuera de alcance por diseño

Ningún trigger en `bd_ventas` escribe a `bd_productos` ni `bd_clientes`; esas tablas solo
se tocarían desde triggers en `bd_detalle_pedidos` (no modificada en esta fase). No se
requirió deshabilitar ningún trigger (Regla 8a no se activó).

## 7. Reversibilidad (`--revert`)

Probado dentro de una transacción que se revirtió (`BEGIN; ...; ROLLBACK;`), sin alterar
el estado real:

```sql
begin;
update bd_ventas v set fecha_hora = b.fecha_hora_anterior
  from bd_ventas_retime_bak_20261014 b where v.id_pedido = b.id_pedido;
-- 3045 de 3045 filas coinciden exactamente con fecha_hora_anterior del backup
rollback;
```

Tras el `rollback`, se confirmó que el estado en vivo seguía siendo el re-horariado
(0 futuras, 0 fuera de horario) — el mecanismo de reversión funciona y el rollback de
prueba no dejó residuo.

## 8. Reproducibilidad (misma seed → mismo resultado)

```python
muestrear_hora_minuto_segundo(date(2026,3,10), 'PED-02160', 42, True, 'rappi')
# run 1: (13, 15, 39)
# run 2: (13, 15, 39)   <- idéntico, misma seed
# seed=43: (19, 48, 31) <- distinto, confirma que el seed realmente determina el resultado
```

## Conclusión

Los 8 criterios de aceptación de Fase 3 se cumplieron en el primer intento. Se procede a
Fase 4 (nuevo autogenerador, `scripts/seed_sinteticos.py`).

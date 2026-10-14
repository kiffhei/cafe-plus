# Fase 5 — Aceptación del nuevo generador (`scripts/seed_sinteticos.py`)

> Verificación ejecutada el 2026-10-14 vía dry-run puro en Python (sin tocar la base de
> datos), simulando el lote 2026-09-15..2026-10-14 (30 días, seed=42, `max_id_actual`
> ficticio=3483). Se encontró y corrigió un bug real durante esta verificación — ver
> sección "Bug encontrado" — antes de que los criterios pasaran. Según Regla 8(c), dos
> fallos consecutivos del MISMO criterio obligarían a detenerse y preguntar; aquí hubo
> un solo fallo (la primera corrida), diagnosticado, corregido, y la segunda corrida
> pasó todos los criterios — no se gastaron los dos intentos permitidos.

## Bug encontrado: colisión de semillas entre `seed_sinteticos.py` y `perfil.py`

**Síntoma:** en el primer dry-run, TODOS los pedidos con `canal='local'` de un mismo día
caían en horas 06-08, y TODOS los pedidos con canal de delivery caían en horas 13-20 —
una separación perfecta 100%/0%, no una tendencia realista. La prueba de coherencia
delivery (`delivery_pico` vs `delivery_06_08`) salió en **1.0 vs 0.0**, imposible bajo
cualquier mezcla probabilística razonable.

**Causa raíz:** `seed_sinteticos._seed_rng(seed_global, id_pedido, "canal_basket")`
(antes del fix, sin el salt `"canal_basket"`) construía la semilla con la misma cadena
exacta que `perfil._seed_pedido`: `f"{seed_global}:{id_pedido}"`. Dos
`numpy.random.default_rng` instanciados con la **misma semilla** producen la misma
secuencia de bits subyacente en sus primeros sorteos. Como `elegir_canal` consumía el
primer sorteo de un generador con esa semilla, y `muestrear_hora_minuto_segundo` (dentro
de `perfil.py`) consumía el primer sorteo de OTRO generador con la **misma** semilla, el
canal elegido y la hora elegida quedaban mapeados desde el mismo cuantil uniforme
subyacente — una correlación espuria, no un patrón de negocio.

**Fix:** se agregó un salt (`"canal_basket"`) a la cadena que genera la semilla del rng
de canal/cliente/basket en `seed_sinteticos.py`, para que nunca coincida con la semilla
que usa `perfil.py` internamente. Un solo cambio de una línea
(`scripts/seed_sinteticos.py`, función `generar_pedido`). No se tocó `perfil.py` — ese
módulo ya es fuente de verdad validada en Fase 3.

Este bug es un buen ejemplo de por qué Fase 5 existe: el generador parecía funcionar
(no tiraba error, producía fechas válidas, dentro de horario, sin futuros) pero el
*patrón* era artificial. Aceptar "corre sin errores" como criterio de éxito habría
dejado pasar un generador roto.

## Resultado tras el fix (segunda corrida)

| Métrica | Valor | Objetivo/banda | Resultado |
|---|---|---|---|
| Pedidos generados (30 días) | 1,435 | ~47.8/día × 30 ≈ 1,434 | ✅ (47.83/día medido) |
| Futuras | 0 | 0 | ✅ |
| Fuera de horario 06-20 CDMX | 0 | 0 | ✅ |
| Concentración lun-vie 06-09 | 0.4164 | [0.40, 0.46] | ✅ |
| Concentración sáb-dom 09-13 | 0.5024 | [0.48, 0.56] | ✅ |
| % sándwich en 12-14h | 0.4435 | > % en 06-08h | ✅ (vs 0.3917) |
| % delivery en picos (13-15/18-20h) | 0.5216 | > % en 06-08h | ✅ (vs 0.3435) |
| Mezcla de canal | local 55.8%, rappi 29.6%, ubereats 11.8%, didi 2.8% | medido: 55.3/31.7/10.3/2.7 | ✅ cercano |
| Cancelación | 13/1435 = 0.91% | medido global 1.29% | ✅ razonable (ruido de muestra) |
| Reproducibilidad (misma seed) | idéntico canal/fecha_hora/productos en dos corridas | — | ✅ |
| Seeds distintas → resultados distintos | confirmado | — | ✅ |

## Integridad respecto a datos existentes

- El generador solo construye objetos `PedidoGenerado` en memoria durante el dry-run —
  cero sentencias SQL se emitieron contra Supabase en esta verificación.
- `insertar_lote()` (la función que sí escribiría) usa exclusivamente `INSERT INTO
  bd_ventas` / `INSERT INTO bd_detalle_pedidos` con `es_sintetico=true` — nunca
  `UPDATE` ni `DELETE` sobre filas existentes, y nunca toca `bd_productos` ni
  `bd_clientes` (Regla 3; confirmado en Fase 3 que ninguna de esas dos tablas tiene
  triggers que se disparen desde `bd_detalle_pedidos`).
- `--revert` no ejecuta ningún DELETE (Regla 1) — ver docstring del script.

## Decisión sobre aplicar el lote a producción

Por disciplina de la Regla 6 ("nunca ajustar parámetros para que un modelo gane"), **no
se aplicó este lote de 30 días a `bd_ventas`** solo para tener más densidad de cara al
forecast de Fase 6. El dataset actual ya combina:

- 2,484 filas reales de ejemplo (2025-01-01..2026-10-02, ~3.9/día — baja densidad,
  útil para tendencia/estacionalidad de largo plazo).
- 561 filas sintéticas (2026-10-06..2026-10-14, ~60-72/día, ya re-horariadas en Fase
  2.3 — densidad alta, útil para patrón intradía reciente).

Si Fase 6 (forecasting) encuentra que esta combinación es insuficiente para una
granularidad diaria confiable, se documentará esa necesidad explícitamente ahí —
con la razón (densidad de datos, no un ajuste cosmético) — antes de correr
`--apply` sobre un rango histórico adicional.

## Conclusión

El generador pasa los 8 criterios de aceptación tras una corrección de bug real
(colisión de semillas), encontrada y corregida dentro del mismo ciclo de verificación
sin necesitar dos intentos fallidos consecutivos. Se procede a Fase 6.

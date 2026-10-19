# Fase 8 — Módulo de Compras/Reabasto

> Extensión de alcance solicitada por el usuario tras revisar el dashboard de Fase 7:
> cerrar el hueco entre "7 SKUs en riesgo de quiebre" (Fase 6) y una política real de
> reabasto — min/max por producto, proveedores reales, y un generador que simula a un
> área de compras actuando sobre el histórico. Plan completo aprobado en
> `/Users/brianear/.claude/plans/sparkling-sleeping-lantern.md` antes de tocar nada
> (hard-gate de diseño: cambio de esquema + múltiples archivos nuevos).

## Regla dura respetada sin excepción

`bd_productos` (incluida `cantidad_stock`) nunca se tocó — ni se le agregó una
columna, ni se escribió en ella. Todo lo nuevo vive en 7 tablas adicionales, RLS
habilitado, sin políticas públicas, igual que `bd_eventos_locales` /
`bd_observaciones_dia` / `bd_anomalias_verdad` en fases anteriores. La bitácora de
stock que usa el generador para decidir cuándo reordenar vive solo en memoria del
script — nunca se escribe en la base real.

## Esquema nuevo

| Tabla | Rol |
|---|---|
| `bd_insumos` | Catálogo de 11 insumos/materia prima (café, leche, pan bollería, pan sándwich, jamón, queso, pollo BBQ, salsa BBQ, agua, chocolate, té) |
| `bd_producto_insumo` | BOM ligero: qué insumo(s) "dispara(n)" el reabasto de cada uno de los 18 productos, con rendimiento por unidad (supuesto, simplificación de alcance documentada abajo) |
| `bd_proveedores` | 7 proveedores reales investigados, con URL y fecha de verificación |
| `bd_proveedor_insumo` | 11 ofertas de precio real (una por insumo), `fuente_precio` = `verificado` o `supuesto` según el caso |
| `bd_politica_inventario` | min/max **por producto** (lo pedido literalmente), con la fórmula completa usada |
| `bd_ordenes_compra` | Encabezado de orden de compra sintética |
| `bd_ordenes_compra_detalle` | Líneas de cada orden (insumo, cantidad, precio, subtotal) |

## Decisión de modelado: BOM ligero, no receta completa

El stock existente (`bd_productos.cantidad_stock`) es por producto terminado (18
SKUs); las compras reales ocurren por insumo. Construir una receta multi-ingrediente
completa (harina+mantequilla+levadura por cada pan, etc.) habría sido sobre-ingeniería
para lo que el ejercicio necesita. Se usó un insumo principal por producto o familia:
los 6 cafés comparten café en grano (+leche donde aplica), los 5 panes comparten un
insumo de bollería congelada, cada sándwich tiene pan + su relleno propio, cada bebida
tiene su insumo dedicado. 29 filas de BOM cubren los 18 productos.

## Proveedores investigados (verificado 2026-10-19)

| Insumo | Proveedor | Precio capturado | Fuente | Nota |
|---|---|---|---|---|
| Café en grano | Kraken Café | $380.00/kg (mín. 6 kg) | **verificado** | [krakencafe.mx](https://krakencafe.mx/cafe-de-especialidad-al-mayoreo/) |
| Pan para sándwich | Mercanto | $62.50/pieza (Pan Blanco Grande Bimbo) | **verificado** | [mercanto.mx](https://mercanto.mx/categorias/panaderia-y-postres) |
| Pan bollería congelada | Mercanto | $9.50/pieza | supuesto — proveedor real, precio no capturado exacto | mercanto.mx |
| Leche entera | Mercanto | $21.00/L (punto medio de rango $18-24 observado) | supuesto | mercanto.mx |
| Jamón/pavo | Saavedra Market | $97.76/kg (Jamón Americano La Hacienda 4.9kg=$479) | **verificado** | [saavedramarket.com](https://www.saavedramarket.com/market) |
| Agua embotellada | MayoreoTotal | $10.75/pieza (paquete 12, extremo bajo del rango $129-239) | supuesto | mayoreototal.mx |
| Té verde | Walmart México (negocio) | $39.00/25 sobres McCormick (retail, no mayoreo) | supuesto | walmart.com.mx |
| Queso (manchego) | Sam's Club | $204.60/kg (Caperucita 1.6kg=$327.36, precio de socio) | **verificado** | [sams.com.mx](https://www.sams.com.mx/ip/queso-tipo-manchego-caperucita-1-6-kg/000244760) |
| Pollo empanizado BBQ | Sam's Club | $224.90/kg — producto BBQ real, precio proxy del Tender sin sabor | supuesto | [sams.com.mx](https://www.sams.com.mx/ip/tender-empanizado-bbq-bachoco-1-36-kg/980032970) |
| Salsa BBQ | Sam's Club | $66.50/L (Love & Kitchen 4kg=$265.98, precio de socio) | **verificado** | [sams.com.mx](https://www.sams.com.mx/ip/salsa-bbq-picante-love-kitchen-4-kg/981026587) |
| Chocolate en polvo | MercadoLibre (vendedor 3º) | $156.00/kg (Abuelita Granulado 1kg) | **verificado** (marketplace, no distribuidor oficial) | [mercadolibre.com.mx](https://www.mercadolibre.com.mx/chocolate-abuelita-granulado-1-kilo-en-polvo/p/MLM19566753) |

6 de 11 ofertas con precio exacto confirmado en una página real (`verificado`); 5 con
proveedor real pero precio estimado dentro de un rango observado o como proxy razonable
(`supuesto`, siempre con la razón documentada en `bd_proveedor_insumo.nota` — nunca una
cifra inventada sin explicación). Queso y pollo BBQ se resolvieron con Sam's Club "a
precio de socio" (sección "artículos para tu negocio") a petición explícita del
usuario, que es la presentación de compra real de un negocio, no de supermercado.

## Metodología min/max (`bd_politica_inventario`)

```
lambda = demanda_diaria_promedio del producto (medido, Fase 6, 652 días)
lead_time_dias = 3 (supuesto uniforme — ningún proveedor investigado publicó su
                     tiempo de entrega en el resultado capturado)
stock_minimo (punto de reorden) = round(lambda*lt + 1.645*sqrt(lambda*lt))
                                   — z=1.645 ~ 95% nivel de servicio, demanda Poisson
lote_economico = round(lambda*lt/5)*5, mínimo 5 — regla simple de "otro ciclo de
                  lead time", no un cálculo EOQ financiero completo
stock_maximo = stock_minimo + lote_economico
```

Resultado: min entre 7-8, max entre 12-13 para los 18 productos (demanda diaria
similar entre SKUs, ~1.2-1.4/día). Este punto de reorden es la política objetivo de un
área de compras — **no es lo mismo** que el riesgo de quiebre de Fase 6
(`fase6_inventario.py`), que mide qué pasa si NADIE repone desde el stock actual.
Ambos números son correctos y responden preguntas distintas; se documentan por
separado en el dashboard para no confundirlos (Regla metodológica de regímenes, ya
usada en Fase 6 para forecast/anomalías).

## Generador `scripts/seed_compras.py`

Mismo patrón que `scripts/seed_sinteticos.py`: dry-run por defecto, `--apply` genera
el SQL de inserción (se aplica manualmente vía el tool de Supabase con backup+conteo
previo, Regla 4), `--revert` explica cómo revertir sin acceso directo a la BD.

Simula una bitácora de stock **solo en memoria** por producto, día por día, sobre el
histórico real+sintético de ventas (2025-01-01 a 2026-10-14, 652 días): arranca en
`stock_maximo`, resta las ventas reales de cada día, y cuando cruza `stock_minimo` (y
no hay ya una orden en tránsito) emite una orden fechada ese día, con entrega
`lead_time_dias` después, por la cantidad que regresa el stock a `stock_maximo`. Las
líneas de producto se convierten a insumos vía el BOM y se redondean hacia arriba al
tamaño de lote real del proveedor (Regla de realismo: se compra en las presentaciones
que de verdad venden, no en fracciones). Líneas del mismo día y mismo proveedor se
consolidan en una sola orden — una compañía real no manda 3 POs separadas el mismo día
al mismo lugar.

Resultado del dry-run: 1,328 órdenes de compra, 2,121 líneas de detalle, gasto
sintético total ~$1.48M MXN sobre 21 meses (~$70k/mes). **Verificación cruzada no
buscada deliberadamente**: ese gasto mensual cae muy cerca del COGS estimado de forma
independiente en Fase 1 (`costo_pct_ponderado=0.41` × ventas objetivo ≈ $78.6k/mes) —
confirma que las órdenes de magnitud del BOM y los precios de proveedor están en el
rango correcto, sin haber sido calibrados para que coincidieran.

## Aplicado a producción (Supabase)

Aplicado el 2026-10-19 vía `execute_sql`, en chunks, con verificación de conteo antes y
después (Regla 4):

| Tabla | Filas |
|---|---|
| `bd_insumos` | 11 |
| `bd_producto_insumo` | 29 |
| `bd_proveedores` | 7 |
| `bd_proveedor_insumo` | 11 |
| `bd_politica_inventario` | 18 |
| `bd_ordenes_compra` | 1,328 (`es_sintetico=true` en el 100%) |
| `bd_ordenes_compra_detalle` | 1,718 |

Gasto sintético total: **$1,475,875.03 MXN** sobre 652 días (~$70,280/mes) — ver nota de
verificación cruzada con Fase 1 arriba.

**Bug encontrado y corregido durante la carga** (antes de aplicar nada incorrecto a
producción): la primera versión de `consolidar_ordenes()` podía generar dos líneas de
detalle para el mismo `(id_orden, id_insumo)` cuando dos productos distintos disparaban
reabasto del mismo insumo el mismo día al mismo proveedor (ej. Café Americano y Café
Frío, ambos necesitando café en grano el mismo día) — violaba la PK de
`bd_ordenes_compra_detalle`. El primer intento de carga falló atómicamente (0 filas
corruptas, nada se aplicó) y lo reportó en vez de improvisar un `ON CONFLICT` o
descartar una fila en silencio. Corregido agregando `_consolidar_lineas_por_insumo()`:
suma las cantidades en una sola línea por insumo y concatena los productos que lo
dispararon (`id_producto_relacionado` pasa de 1 a una lista separada por comas cuando
aplica) — así compra una empresa real: una línea por SKU, no una por producto vendido.
1,718 líneas finales (vs. 2,121 antes del fix), mismo gasto total (la corrección solo
fusionó líneas duplicadas, no cambió cantidades).

**Verificación de cierre:**
- `bd_productos`=18, `bd_ventas`=4745, `bd_detalle_pedidos`=9741 — idénticos a antes de
  empezar Fase 8 (prueba de que las tablas reales nunca se tocaron).
- RLS habilitado en las 7 tablas nuevas, 0 políticas públicas (`pg_policies`).
- 0 filas huérfanas en `bd_ordenes_compra_detalle` (todo `id_orden` referencia una
  orden real en `bd_ordenes_compra`).

## Nota de productización (BA Automation)

El usuario señaló, correctamente, que si esto puede automatizarse para un negocio de
ejemplo, es un servicio vendible: un agente de compras que vigila política min/max,
cataloga proveedores reales con precio, y emite órdenes cuando corresponde — hoy en
Café+ corre sobre datos sintéticos/históricos, pero el mismo patrón (política +
catálogo de proveedores + generador disparado por umbral) es el núcleo de un producto
de reabasto automatizado real. Se deja como observación documentada; construir ese
producto está fuera del alcance de este plan.

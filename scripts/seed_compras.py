#!/usr/bin/env python3
"""Fase 8.3 — Generador de órdenes de compra sintéticas (bd_ordenes_compra[_detalle]).

Simula a un área de compras actuando con política de reorden (min/max, fase8_politica.py)
sobre el historial real+sintético de ventas por producto. La bitácora de stock que usa
para decidir CUÁNDO pedir vive solo en este script — NUNCA escribe en
bd_productos.cantidad_stock (Regla 3, intacta).

Uso:
    python scripts/seed_compras.py              # dry-run (default) — no toca la BD
    python scripts/seed_compras.py --apply       # inserta en bd_ordenes_compra[_detalle]
    python scripts/seed_compras.py --revert      # borra solo lo insertado por este script

Requiere, ya exportados por el flujo de Fase 8:
    analytics/out/_ventas_diarias_producto.json   (fecha, id_producto, unidades — real)
    analytics/out/fase8_politica.json             (stock_minimo/maximo por producto)
    analytics/out/_bom_producto_insumo.json       (snapshot de bd_producto_insumo)
    analytics/out/_proveedor_insumo.json          (snapshot de bd_proveedor_insumo)
"""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ANALYTICS = Path(__file__).parent.parent / "analytics"
OUT = ANALYTICS / "out"
BATCH_TAG = "fase8_seed_compras_v1"


def cargar_datos():
    ventas = json.loads((OUT / "_ventas_diarias_producto.json").read_text())
    politica = {p["id_producto"]: p for p in json.loads((OUT / "fase8_politica.json").read_text())["politicas"]}
    bom = json.loads((OUT / "_bom_producto_insumo.json").read_text())
    proveedor_insumo = {pi["id_insumo"]: pi for pi in json.loads((OUT / "_proveedor_insumo.json").read_text())}
    return ventas, politica, bom, proveedor_insumo


def ventas_por_producto_fecha(ventas: list[dict]) -> dict[str, dict[date, int]]:
    por_producto: dict[str, dict[date, int]] = defaultdict(dict)
    for fila in ventas:
        f = datetime.strptime(fila["fecha"], "%Y-%m-%d").date()
        por_producto[fila["id_producto"]][f] = fila["unidades"]
    return por_producto


def simular_reordenes(politica: dict, ventas_por_producto: dict) -> list[dict]:
    """Bitácora de stock proyectado por producto (solo en memoria) -> eventos de reorden."""
    todas_fechas = sorted({f for serie in ventas_por_producto.values() for f in serie})
    desde, hasta = todas_fechas[0], todas_fechas[-1]

    eventos = []
    for id_producto, pol in politica.items():
        serie = ventas_por_producto.get(id_producto, {})
        stock = pol["stock_maximo"]
        pendiente = None  # (fecha_llegada, cantidad) — a lo más 1 orden en tránsito por producto
        d = desde
        while d <= hasta:
            if pendiente and pendiente[0] == d:
                stock += pendiente[1]
                pendiente = None
            vendido = serie.get(d, 0)
            stock -= vendido
            if stock < pol["stock_minimo"] and pendiente is None:
                cantidad = pol["stock_maximo"] - stock
                llegada = d + timedelta(days=pol["lead_time_dias"])
                eventos.append({
                    "id_producto": id_producto,
                    "fecha_emision": d,
                    "fecha_entrega_estimada": llegada,
                    "cantidad_producto": cantidad,
                    "motivo": f"stock proyectado ({stock}) cruzo stock_minimo ({pol['stock_minimo']}) el {d.isoformat()}",
                })
                pendiente = (llegada, cantidad)
            stock = max(stock, 0)
            d += timedelta(days=1)
    return eventos


def convertir_a_insumos(eventos: list[dict], bom: list[dict], proveedor_insumo: dict) -> list[dict]:
    """Cada evento de reorden (producto) -> 1+ líneas de insumo, redondeadas al tamaño de lote real."""
    bom_por_producto = defaultdict(list)
    for fila in bom:
        bom_por_producto[fila["id_producto"]].append(fila)

    lineas = []
    for ev in eventos:
        for b in bom_por_producto.get(ev["id_producto"], []):
            pi = proveedor_insumo[b["id_insumo"]]
            cantidad_insumo = ev["cantidad_producto"] * b["rendimiento_por_unidad"]
            lote = pi["tamano_lote"]
            cantidad_redondeada = math.ceil(cantidad_insumo / lote) * lote
            lineas.append({
                "fecha_emision": ev["fecha_emision"],
                "id_proveedor": pi["id_proveedor"],
                "id_insumo": b["id_insumo"],
                "id_producto_relacionado": ev["id_producto"],
                "cantidad": round(cantidad_redondeada, 3),
                "precio_unitario": pi["precio_unitario"],
                "motivo": ev["motivo"],
            })
    return lineas


def consolidar_ordenes(lineas: list[dict]) -> list[dict]:
    """Agrupa líneas del mismo día + mismo proveedor en una sola orden de compra
    (una compañía real consolida su pedido diario a un proveedor, no manda 3 POs
    separadas el mismo día al mismo lugar)."""
    grupos = defaultdict(list)
    for ln in lineas:
        grupos[(ln["fecha_emision"], ln["id_proveedor"])].append(ln)

    ordenes = []
    n = 0
    for (fecha, id_proveedor), grupo in sorted(grupos.items()):
        n += 1
        id_orden = f"OC-{fecha.strftime('%Y%m%d')}-{id_proveedor}-{n:05d}"
        motivos = sorted({g["motivo"].split(" el ")[0] + f" ({g['id_producto_relacionado']})" for g in grupo})
        ordenes.append({
            "id_orden": id_orden,
            "fecha_emision": fecha,
            "id_proveedor": id_proveedor,
            "detalle": _consolidar_lineas_por_insumo(grupo),
            "motivo_generacion": "; ".join(motivos)[:500],
        })
    return ordenes


def _consolidar_lineas_por_insumo(grupo: list[dict]) -> list[dict]:
    """Una orden real tiene a lo mas 1 linea por insumo (bd_ordenes_compra_detalle
    tiene PK (id_orden, id_insumo)) — si 2 productos distintos dispararon reorden del
    mismo insumo el mismo dia al mismo proveedor, se suman en una sola linea en vez de
    mandar 2 renglones duplicados del mismo SKU (asi compra una empresa real)."""
    por_insumo: dict[str, dict] = {}
    for ln in grupo:
        existente = por_insumo.get(ln["id_insumo"])
        if existente is None:
            por_insumo[ln["id_insumo"]] = {**ln, "id_producto_relacionado": [ln["id_producto_relacionado"]]}
        else:
            existente["cantidad"] = round(existente["cantidad"] + ln["cantidad"], 3)
            if ln["id_producto_relacionado"] not in existente["id_producto_relacionado"]:
                existente["id_producto_relacionado"].append(ln["id_producto_relacionado"])
    consolidadas = []
    for ln in por_insumo.values():
        ln["id_producto_relacionado"] = ",".join(ln["id_producto_relacionado"])
        consolidadas.append(ln)
    return consolidadas


def dry_run(ordenes: list[dict], proveedor_insumo: dict) -> None:
    total_gasto = sum(ln["cantidad"] * ln["precio_unitario"] for o in ordenes for ln in o["detalle"])
    print(f"[DRY-RUN] {len(ordenes)} ordenes de compra, {sum(len(o['detalle']) for o in ordenes)} lineas")
    print(f"[DRY-RUN] gasto sintetico total simulado: ${total_gasto:,.2f} MXN")
    print("[DRY-RUN] primeras 3 ordenes:")
    for o in ordenes[:3]:
        print(f"  {o['id_orden']} | {o['fecha_emision']} | {o['id_proveedor']} | {len(o['detalle'])} lineas")
        for ln in o["detalle"]:
            print(f"      {ln['id_insumo']} x{ln['cantidad']} @ ${ln['precio_unitario']} <- {ln['id_producto_relacionado']}")
    print("[DRY-RUN] nada se escribio en la base de datos. Usa --apply para insertar.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--revert", action="store_true")
    args = ap.parse_args()

    if args.revert:
        print("--revert: este script NO borra directamente (no tiene acceso a la BD).")
        print("Para revertir, correr vía el tool de Supabase:")
        print(f"  delete from bd_ordenes_compra_detalle where id_orden in (select id_orden from bd_ordenes_compra where motivo_generacion like '%%');")
        print("  delete from bd_ordenes_compra where es_sintetico = true;")
        print("(Tablas creadas en esta fase, 100% sintéticas — no hay riesgo para datos reales.)")
        return

    ventas, politica, bom, proveedor_insumo = cargar_datos()
    ventas_por_producto = ventas_por_producto_fecha(ventas)
    eventos = simular_reordenes(politica, ventas_por_producto)
    lineas = convertir_a_insumos(eventos, bom, proveedor_insumo)
    ordenes = consolidar_ordenes(lineas)

    # fecha_entrega_estimada real = fecha_emision + lead_time del proveedor de CUALQUIER linea (mismo proveedor)
    for o in ordenes:
        lead = proveedor_insumo[o["detalle"][0]["id_insumo"]]["lead_time_dias"]
        o["fecha_entrega_estimada"] = o["fecha_emision"] + timedelta(days=lead)

    if not args.apply:
        dry_run(ordenes, proveedor_insumo)
        (OUT / "_dry_run_ordenes_compra.json").write_text(json.dumps(
            [{**o, "fecha_emision": o["fecha_emision"].isoformat(),
              "fecha_entrega_estimada": o["fecha_entrega_estimada"].isoformat(),
              "detalle": [{**ln, "fecha_emision": ln["fecha_emision"].isoformat()} for ln in o["detalle"]]}
             for o in ordenes], indent=2, ensure_ascii=False))
        return

    sql = generar_sql_insercion_v2(ordenes)
    (OUT / "_apply_ordenes_compra.sql").write_text(sql)
    print(f"SQL de insercion escrito en {OUT / '_apply_ordenes_compra.sql'}")
    print(f"{len(ordenes)} ordenes, {sum(len(o['detalle']) for o in ordenes)} lineas de detalle.")
    print("Revisar y ejecutar manualmente via el tool de Supabase (con backup+conteo previo, Regla 4).")


def generar_sql_insercion_v2(ordenes: list[dict]) -> str:
    def esc(s: str) -> str:
        return s.replace("'", "''")

    lineas_orden = []
    lineas_detalle = []
    for o in ordenes:
        lineas_orden.append(
            f"('{o['id_orden']}','{o['fecha_emision'].isoformat()}',"
            f"'{o['fecha_entrega_estimada'].isoformat()}','{o['id_proveedor']}','recibida',true,'{esc(o['motivo_generacion'])}')"
        )
        for ln in o["detalle"]:
            subtotal = round(ln["cantidad"] * ln["precio_unitario"], 2)
            lineas_detalle.append(
                f"('{o['id_orden']}','{ln['id_insumo']}','{ln['id_producto_relacionado']}',"
                f"{ln['cantidad']},{ln['precio_unitario']},{subtotal})"
            )

    sql = "-- generado por scripts/seed_compras.py --apply (" + BATCH_TAG + ")\n"
    sql += "insert into public.bd_ordenes_compra (id_orden, fecha_emision, fecha_entrega_estimada, id_proveedor, estado, es_sintetico, motivo_generacion) values\n"
    sql += ",\n".join(lineas_orden) + ";\n\n"
    sql += "insert into public.bd_ordenes_compra_detalle (id_orden, id_insumo, id_producto_relacionado, cantidad, precio_unitario, subtotal) values\n"
    sql += ",\n".join(lineas_detalle) + ";\n"
    return sql


if __name__ == "__main__":
    main()

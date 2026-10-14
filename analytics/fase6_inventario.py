"""Fase 6.6 — Inventario: riesgo de quiebre de stock, Monte Carlo.

cantidad_stock es una fotografía estática (Regla 3: nunca se escribe ahí) — no hay
reabasto automático en el sistema actual. Esta simulación responde "si nadie repone,
¿cuántos días aguanta cada SKU al ritmo de demanda medido?" — útil para decidir política
de reorden (s,S), no para predecir el stock real (que el dueño repone manualmente).

Demanda diaria por SKU modelada como Poisson(λ = unidades_totales / dias_totales) —
supuesto razonable para conteos de unidades vendidas por día, no medido directamente
(Regla 7: el modelo de demanda es supuesto, los datos agregados que lo alimentan son
medidos).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

OUT = Path(__file__).parent / "out"
DIAS_TOTALES_HISTORIA = 652  # 2025-01-01 .. 2026-10-14, ver fase6_forecast.py

PRODUCTOS = [
    {"id_producto": "PRD-010", "nombre": "Croissant", "categoria": "pan", "cantidad_stock": 40, "costo": 13.00, "precio_venta": 32.00, "unidades_totales": 940},
    {"id_producto": "PRD-004", "nombre": "Café Frío", "categoria": "cafe", "cantidad_stock": 60, "costo": 20.00, "precio_venta": 50.00, "unidades_totales": 907},
    {"id_producto": "PRD-002", "nombre": "Café Latte", "categoria": "cafe", "cantidad_stock": 80, "costo": 18.00, "precio_venta": 45.00, "unidades_totales": 895},
    {"id_producto": "PRD-011", "nombre": "Muffin Chocolate", "categoria": "pan", "cantidad_stock": 45, "costo": 14.00, "precio_venta": 35.00, "unidades_totales": 891},
    {"id_producto": "PRD-003", "nombre": "Cappuccino", "categoria": "cafe", "cantidad_stock": 70, "costo": 19.00, "precio_venta": 48.00, "unidades_totales": 878},
    {"id_producto": "PRD-018", "nombre": "Sandwich Pollo BBQ", "categoria": "sandwich", "cantidad_stock": 25, "costo": 28.00, "precio_venta": 65.00, "unidades_totales": 877},
    {"id_producto": "PRD-016", "nombre": "Sandwich Caprese", "categoria": "sandwich", "cantidad_stock": 25, "costo": 27.00, "precio_venta": 62.00, "unidades_totales": 874},
    {"id_producto": "PRD-009", "nombre": "Agua Natural 500ml", "categoria": "bebida", "cantidad_stock": 120, "costo": 7.00, "precio_venta": 20.00, "unidades_totales": 872},
    {"id_producto": "PRD-017", "nombre": "Club Sandwich", "categoria": "sandwich", "cantidad_stock": 25, "costo": 30.00, "precio_venta": 68.00, "unidades_totales": 865},
    {"id_producto": "PRD-012", "nombre": "Muffin Blueberry", "categoria": "pan", "cantidad_stock": 45, "costo": 14.00, "precio_venta": 35.00, "unidades_totales": 862},
    {"id_producto": "PRD-001", "nombre": "Café Americano", "categoria": "cafe", "cantidad_stock": 80, "costo": 14.00, "precio_venta": 35.00, "unidades_totales": 851},
    {"id_producto": "PRD-013", "nombre": "Pan de Elote", "categoria": "pan", "cantidad_stock": 35, "costo": 11.00, "precio_venta": 28.00, "unidades_totales": 844},
    {"id_producto": "PRD-007", "nombre": "Chocolate Caliente", "categoria": "bebida", "cantidad_stock": 60, "costo": 17.00, "precio_venta": 42.00, "unidades_totales": 840},
    {"id_producto": "PRD-005", "nombre": "Café Espresso", "categoria": "cafe", "cantidad_stock": 90, "costo": 12.00, "precio_venta": 30.00, "unidades_totales": 829},
    {"id_producto": "PRD-014", "nombre": "Pan de Nuez", "categoria": "pan", "cantidad_stock": 35, "costo": 12.00, "precio_venta": 30.00, "unidades_totales": 811},
    {"id_producto": "PRD-006", "nombre": "Frappé Caramelo", "categoria": "cafe", "cantidad_stock": 50, "costo": 24.00, "precio_venta": 58.00, "unidades_totales": 797},
    {"id_producto": "PRD-015", "nombre": "Sandwich Jamón", "categoria": "sandwich", "cantidad_stock": 30, "costo": 24.00, "precio_venta": 55.00, "unidades_totales": 785},
    {"id_producto": "PRD-008", "nombre": "Té Verde", "categoria": "bebida", "cantidad_stock": 55, "costo": 14.00, "precio_venta": 38.00, "unidades_totales": 776},
]


def simular_sku(lam: float, stock_inicial: int, horizonte_dias: int, n_sim: int, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    demanda = rng.poisson(lam, size=(n_sim, horizonte_dias))
    acumulada = np.cumsum(demanda, axis=1)
    quiebre_dia = np.full(n_sim, -1)
    for d in range(horizonte_dias):
        quiebra_hoy = (acumulada[:, d] >= stock_inicial) & (quiebre_dia == -1)
        quiebre_dia[quiebra_hoy] = d + 1
    nunca_quiebra = quiebre_dia == -1
    dias_hasta_quiebre = quiebre_dia[~nunca_quiebra]
    return {
        "prob_quiebre_7d": round(float(np.mean((quiebre_dia != -1) & (quiebre_dia <= 7))), 3),
        "prob_quiebre_14d": round(float(np.mean((quiebre_dia != -1) & (quiebre_dia <= 14))), 3),
        "prob_quiebre_30d": round(float(np.mean((quiebre_dia != -1) & (quiebre_dia <= 30))), 3),
        "dias_hasta_quiebre_mediana": round(float(np.median(dias_hasta_quiebre)), 1) if len(dias_hasta_quiebre) else None,
    }


def main() -> None:
    horizonte = 30
    n_sim = 5000
    resultados = []
    for i, p in enumerate(PRODUCTOS):
        lam = p["unidades_totales"] / DIAS_TOTALES_HISTORIA
        sim = simular_sku(lam, p["cantidad_stock"], horizonte, n_sim, seed=100 + i)
        margen_unitario = round(p["precio_venta"] - p["costo"], 2)
        resultados.append({
            **{k: p[k] for k in ("id_producto", "nombre", "categoria", "cantidad_stock")},
            "demanda_diaria_promedio": round(lam, 2),
            "margen_unitario": margen_unitario,
            **sim,
        })

    resultados.sort(key=lambda r: r["prob_quiebre_30d"], reverse=True)

    out = {
        "supuesto_modelo": "Demanda diaria ~ Poisson(lambda=unidades_totales/652 días), sin reabasto — cantidad_stock es fotografía estática (Regla 3). Horizonte 30 días, 5,000 simulaciones Monte Carlo por SKU.",
        "horizonte_dias": horizonte,
        "n_simulaciones": n_sim,
        "skus_riesgo_alto_30d": [r for r in resultados if r["prob_quiebre_30d"] >= 0.5],
        "todos_los_skus": resultados,
    }
    (OUT / "fase6_inventario.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps({k: v for k, v in out.items() if k != "todos_los_skus"}, indent=2, ensure_ascii=False))
    print(f"\n{len(out['skus_riesgo_alto_30d'])} SKUs con >=50% prob. de quiebre en 30 días sin reabasto:")
    for r in out["skus_riesgo_alto_30d"]:
        print(f"  {r['id_producto']} {r['nombre']}: stock={r['cantidad_stock']}, demanda/día={r['demanda_diaria_promedio']}, quiebre_30d={r['prob_quiebre_30d']}")


if __name__ == "__main__":
    main()

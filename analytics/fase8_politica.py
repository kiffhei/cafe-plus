"""Fase 8.1 — Política de inventario (min/max) por producto.

Punto de reorden clásico con demanda Poisson (misma lambda que fase6_inventario.py):
  stock_minimo = round(lambda*lead_time + z * sqrt(lambda*lead_time))   z=1.645 (~95% NS)
  stock_maximo = stock_minimo + lote_economico (redondeado a múltiplo de 5)

lead_time_dias = 3 (SUPUESTO uniforme — ningún proveedor investigado publicó su tiempo
de entrega en el resultado capturado; ver docs/FASE8_COMPRAS.md). lambda sí es medido
(Fase 6, 652 días de historia real+sintética).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

OUT = Path(__file__).parent / "out"
Z_95 = 1.645
LEAD_TIME_DIAS = 3


def main() -> None:
    inv = json.loads((OUT / "fase6_inventario.json").read_text())
    productos = inv["todos_los_skus"]

    politicas = []
    for p in productos:
        lam = p["demanda_diaria_promedio"]
        demanda_lead_time = lam * LEAD_TIME_DIAS
        stock_minimo = round(demanda_lead_time + Z_95 * math.sqrt(demanda_lead_time))
        lote_economico = max(5, round(demanda_lead_time / 5) * 5)
        stock_maximo = stock_minimo + lote_economico
        politicas.append({
            "id_producto": p["id_producto"],
            "nombre": p["nombre"],
            "categoria": p["categoria"],
            "demanda_diaria_promedio": lam,
            "lead_time_dias": LEAD_TIME_DIAS,
            "stock_minimo": stock_minimo,
            "stock_maximo": stock_maximo,
            "metodo_calculo": (
                f"ROP=round(lambda*lt + 1.645*sqrt(lambda*lt)), lambda={lam} (medido, Fase 6), "
                f"lt={LEAD_TIME_DIAS}d (supuesto), lote_economico={lote_economico} "
                f"(round(lambda*lt/5)*5, min 5) -> stock_maximo=ROP+lote_economico"
            ),
        })

    out = {
        "supuesto_metodologia": (
            "Punto de reorden con demanda Poisson y nivel de servicio 95% (z=1.645). "
            "lambda es medido (Fase 6, 652 dias). lead_time_dias=3 es supuesto uniforme "
            "(ningun proveedor investigado publico tiempo de entrega). lote_economico es "
            "una regla simple de reabasto a 5 dias de demanda, redondeada a multiplo de 5, "
            "no un calculo EOQ financiero completo."
        ),
        "politicas": politicas,
    }
    (OUT / "fase8_politica.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

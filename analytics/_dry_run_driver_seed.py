"""Driver temporal de esta sesión: corre el dry-run de seed_sinteticos.py sin DB (usa un
max_id_actual fijo pasado a mano, ya que no hay DATABASE_URL disponible). No es un
deliverable de fase — ver scripts/seed_sinteticos.py para el script real standalone."""

import json
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from seed_sinteticos import cargar_mix, generar_lote, construir_reporte_dry_run, descuento_de, total_de

TZ_CDMX = ZoneInfo("America/Mexico_City")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--desde", required=True)
    parser.add_argument("--hasta", required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-id-actual", type=int, default=3483)  # último PED-##### visto en bd_ventas
    args = parser.parse_args()

    mix = cargar_mix()
    clientes_descuento = {
        "CLI-001": 10.0, "CLI-002": 10.0, "CLI-003": 0.0, "CLI-004": 10.0,
        "CLI-005": 0.0, "CLI-006": 10.0, "CLI-007": 0.0, "CLI-008": 0.0, "CLI-009": 0.0,
    }
    ahora_cdmx = datetime.now(TZ_CDMX)

    pedidos, anomalias = generar_lote(
        date.fromisoformat(args.desde), date.fromisoformat(args.hasta),
        args.seed, args.max_id_actual, mix, clientes_descuento, ahora_cdmx,
    )
    reporte = construir_reporte_dry_run(pedidos)
    print(json.dumps(reporte, indent=2, ensure_ascii=False))
    print(f"Anomalías/eventos activos en el rango: {len(anomalias)}")
    for a in anomalias:
        print(" ", a)

    out = {
        "reporte": reporte,
        "anomalias": anomalias,
        "pedidos": [
            {
                "id_pedido": p.id_pedido,
                "fecha_hora": p.fecha_hora.isoformat(),
                "id_cajero": p.id_cajero,
                "nombre_cajero": p.nombre_cajero,
                "id_cliente": p.id_cliente,
                "canal": p.canal,
                "subtotal": p.subtotal,
                "descuento": descuento_de(p),
                "total": total_de(p),
                "estado": p.estado,
                "lineas": [
                    {"id_producto": l.id_producto, "nombre_producto": l.nombre_producto,
                     "cantidad": l.cantidad, "precio_unitario": l.precio_unitario,
                     "subtotal_linea": l.subtotal_linea}
                    for l in p.lineas
                ],
            }
            for p in pedidos
        ],
    }
    (Path(__file__).parent / "out" / "_dry_run_plan_sinteticos.json").write_text(
        json.dumps(out, indent=2, ensure_ascii=False)
    )
    print(f"\nPlan completo escrito en analytics/out/_dry_run_plan_sinteticos.json ({len(pedidos)} pedidos)")

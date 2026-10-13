"""Driver temporal de esta sesión: corre el dry-run de retime_pedidos.py reusando sus
funciones puras, a partir del snapshot exportado vía MCP de Supabase (no hay
DATABASE_URL local disponible para psycopg en este entorno). No es un deliverable de
fase — ver scripts/retime_pedidos.py para el script real standalone."""

import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from retime_pedidos import Pedido, construir_reporte_dry_run, TZ_UTC

SNAPSHOT = Path(__file__).parent / "out" / "_snapshot_ventas.json"
TZ_CDMX = ZoneInfo("America/Mexico_City")


def cargar_pedidos() -> list[Pedido]:
    data = json.loads(SNAPSHOT.read_text())
    pedidos = []
    for r in data:
        fh = datetime.fromisoformat(r["fecha_hora"]).astimezone(TZ_UTC)
        pedidos.append(
            Pedido(
                id_pedido=r["id_pedido"],
                fecha_hora_actual=fh,
                es_sintetico=r["es_sintetico"],
                canal=r["canal"],
                tiene_sandwich=r["tiene_sandwich"],
            )
        )
    return pedidos


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    pedidos = cargar_pedidos()
    ahora_cdmx = datetime.now(TZ_CDMX)
    reporte = construir_reporte_dry_run(pedidos, args.seed, ahora_cdmx)

    print(f"Ahora (CDMX): {ahora_cdmx}")
    print(f"Total pedidos: {reporte['total_pedidos']}")
    print(f"Fuera de horario / futuro (debe ser 0 tras aplicar): {reporte['fuera_de_horario_futuro']}")
    print(f"Histograma ANTES (hora CDMX): {reporte['histograma_antes_cdmx']}")
    print(f"Histograma DESPUÉS (hora CDMX): {reporte['histograma_despues_cdmx']}")
    print(f"Concentración lun-vie 06-09: {reporte['concentracion_lunvie_06_09']} (objetivo {reporte['banda_lunvie_objetivo']})")
    print(f"Concentración sáb-dom 09-13: {reporte['concentracion_sabdom_09_13']} (objetivo {reporte['banda_sabdom_objetivo']})")

    out = {
        "total_pedidos": reporte["total_pedidos"],
        "fuera_de_horario_futuro": reporte["fuera_de_horario_futuro"],
        "histograma_antes_cdmx": reporte["histograma_antes_cdmx"],
        "histograma_despues_cdmx": reporte["histograma_despues_cdmx"],
        "concentracion_lunvie_06_09": reporte["concentracion_lunvie_06_09"],
        "concentracion_sabdom_09_13": reporte["concentracion_sabdom_09_13"],
        "nuevas_fechas": {k: v.isoformat() for k, v in reporte["nuevas_fechas"].items()},
    }
    (Path(__file__).parent / "out" / "_dry_run_plan.json").write_text(json.dumps(out, indent=2))
    print(f"\nPlan completo escrito en analytics/out/_dry_run_plan.json ({len(out['nuevas_fechas'])} pedidos)")

"""Fase 6.7 — Escenarios de volumen y margen.

Reusa los resultados ya calculados y validados en Fase 1 (analytics/out/economia.json:
contribución marginal por pedido, costos fijos mensuales) — no se re-inventan supuestos
nuevos aquí, solo se aplican a distintos niveles de volumen para comparar.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).parent / "out"


def main() -> None:
    eco = json.loads((OUT / "economia.json").read_text())
    contrib_pct = eco["resultado"]["contribucion_pct"]
    contrib_por_pedido = eco["resultado"]["contribucion_dollar_por_pedido"]
    costos_fijos = eco["resultado"]["costos_fijos_mensuales"]
    ticket_prom = eco["medido"]["ticket_promedio_subtotal"]
    crecimiento_anual = eco["supuestos"]["crecimiento_anual"]

    capacidad_json = json.loads((OUT / "fase6_capacidad.json").read_text())
    punto_quiebre_entre_semana = capacidad_json["curva_punto_quiebre_entre_semana"][-1]["volumen_pedidos_dia"]

    daily = json.loads((Path(__file__).parent / "out" / "_daily_full.json").read_text())
    ultimos_30 = sorted(daily, key=lambda r: r["fecha"])[-30:]
    volumen_actual_30d = sum(r["n_pedidos"] for r in ultimos_30) / 30

    def escenario(nombre: str, pedidos_dia: float, nota: str) -> dict:
        pedidos_mes = pedidos_dia * 30.4
        ventas_mes = pedidos_mes * ticket_prom
        contribucion_mes = pedidos_mes * contrib_por_pedido
        utilidad_mes = contribucion_mes - costos_fijos
        margen_pct = utilidad_mes / ventas_mes if ventas_mes else 0
        return {
            "escenario": nombre, "nota": nota,
            "pedidos_dia": round(pedidos_dia, 1), "pedidos_mes": round(pedidos_mes, 0),
            "ventas_mensuales": round(ventas_mes, 2), "utilidad_mensual": round(utilidad_mes, 2),
            "margen_operativo_pct": round(margen_pct * 100, 1),
        }

    objetivo = eco["resultado"]["objetivo_pedidos_dia"]
    escenarios = [
        escenario("actual_medido_30d", volumen_actual_30d, "Promedio real de los últimos 30 días del dataset (mezcla histórico+sintético)"),
        escenario("equilibrio", eco["resultado"]["equilibrio_pedidos_dia"], "Punto de equilibrio — utilidad = 0 antes de la utilidad objetivo"),
        escenario("objetivo_fase1", objetivo, "Volumen objetivo de Fase 1 (utilidad objetivo $22,000/mes)"),
        escenario("objetivo_mas_crecimiento_1a", objetivo * (1 + crecimiento_anual), f"Objetivo con 1 año de crecimiento al {crecimiento_anual*100:.0f}% (supuesto Fase 1)"),
        escenario("objetivo_mas_crecimiento_3a", objetivo * (1 + crecimiento_anual) ** 3, f"Objetivo con 3 años de crecimiento al {crecimiento_anual*100:.0f}% anual compuesto"),
        escenario("punto_quiebre_capacidad", punto_quiebre_entre_semana, "Volumen donde SimPy detecta >10% de pedidos excediendo el SLA de 5 min con 2 cajeros — NO es un escenario recomendado, es el techo operativo actual"),
    ]

    out = {"supuesto": "Contribución marginal y ticket promedio tomados de Fase 1 (economia.json), constantes entre escenarios — no se re-calibran por volumen.", "escenarios": escenarios}
    (OUT / "fase6_escenarios.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

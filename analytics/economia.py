"""Fase 1 — economía del negocio simulado (Café Plus).

Lee analytics/config.yaml, calcula contribución por pedido, punto de equilibrio,
volumen objetivo diario/mensual, y una tabla de sensibilidad. Escribe
analytics/out/economia.json. No toca la base de datos.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).parent / "config.yaml"
OUT_PATH = Path(__file__).parent / "out" / "economia.json"
DIAS_POR_MES = 30.4
SALARIO_MINIMO_DIARIO_2026 = 315.04  # SUPUESTO verificado por el usuario, no recalculado aquí


@dataclass(frozen=True)
class Medido:
    ticket_subtotal: float
    costo_pct: float
    descuento_pct: float
    mix_delivery: float


@dataclass(frozen=True)
class Supuestos:
    empleados: int
    sueldo_mensual_por_empleado: float
    factor_carga_social: float
    renta_mensual: float
    servicios_mensual: float
    otros_fijos_mensual: float
    utilidad_objetivo_mensual: float
    merma_pct: float
    comision_delivery_pct: float
    empaque_delivery_por_pedido: float
    pct_pagos_tarjeta: float
    comision_tarjeta_pct: float
    crecimiento_anual: float


def cargar_config() -> tuple[Supuestos, Medido]:
    data = yaml.safe_load(CONFIG_PATH.read_text())
    e = data["economia"]
    m = data["medido"]
    supuestos = Supuestos(
        empleados=e["empleados"],
        sueldo_mensual_por_empleado=e["sueldo_mensual_por_empleado"],
        factor_carga_social=e["factor_carga_social"],
        renta_mensual=e["renta_mensual"],
        servicios_mensual=e["servicios_mensual"],
        otros_fijos_mensual=e["otros_fijos_mensual"],
        utilidad_objetivo_mensual=e["utilidad_objetivo_mensual"],
        merma_pct=e["merma_pct"],
        comision_delivery_pct=e["comision_delivery_pct"],
        empaque_delivery_por_pedido=e["empaque_delivery_por_pedido"],
        pct_pagos_tarjeta=e["pct_pagos_tarjeta"],
        comision_tarjeta_pct=e["comision_tarjeta_pct"],
        crecimiento_anual=e["crecimiento_anual"],
    )
    medido = Medido(
        ticket_subtotal=m["ticket_promedio_subtotal"],
        costo_pct=m["costo_pct_ponderado"],
        descuento_pct=m["descuento_pct_ponderado"],
        mix_delivery=m["mix_delivery"],
    )
    return supuestos, medido


def contribucion_pct(s: Supuestos, m: Medido, ticket: float, comision_delivery: float) -> float:
    empaque_pct = m.mix_delivery * (s.empaque_delivery_por_pedido / ticket)
    comision_pct = m.mix_delivery * comision_delivery
    tarjeta_pct = s.pct_pagos_tarjeta * s.comision_tarjeta_pct
    return 1 - (m.costo_pct + s.merma_pct + comision_pct + empaque_pct + m.descuento_pct + tarjeta_pct)


def costos_fijos_mensuales(s: Supuestos) -> float:
    nomina = s.empleados * s.sueldo_mensual_por_empleado * s.factor_carga_social
    return nomina + s.renta_mensual + s.servicios_mensual + s.otros_fijos_mensual


def volumen_pedidos_dia(costos_mensuales: float, contribucion_dollar: float) -> float:
    return (costos_mensuales / contribucion_dollar) / DIAS_POR_MES


def construir_reporte() -> dict:
    s, m = cargar_config()

    salario_minimo_mensual = SALARIO_MINIMO_DIARIO_2026 * DIAS_POR_MES
    sueldo_cumple_minimo = s.sueldo_mensual_por_empleado >= salario_minimo_mensual

    c_pct = contribucion_pct(s, m, m.ticket_subtotal, s.comision_delivery_pct)
    c_dollar = c_pct * m.ticket_subtotal

    fijos = costos_fijos_mensuales(s)
    equilibrio_dia = volumen_pedidos_dia(fijos, c_dollar)
    objetivo_dia = volumen_pedidos_dia(fijos + s.utilidad_objetivo_mensual, c_dollar)

    objetivo_mes = objetivo_dia * DIAS_POR_MES
    ventas_mensuales_objetivo = objetivo_mes * m.ticket_subtotal * (1 - m.descuento_pct)
    margen_operativo_pct = s.utilidad_objetivo_mensual / ventas_mensuales_objetivo

    sensibilidad = []
    tickets = [m.ticket_subtotal * f for f in (0.90, 0.95, 1.00, 1.05, 1.10)]
    comisiones = [s.comision_delivery_pct + d for d in (-0.10, -0.05, 0.0, 0.05, 0.10)]
    for ticket in tickets:
        for comision in comisiones:
            if comision < 0:
                continue
            c_pct_i = contribucion_pct(s, m, ticket, comision)
            c_dollar_i = c_pct_i * ticket
            equilibrio_i = volumen_pedidos_dia(fijos, c_dollar_i)
            objetivo_i = volumen_pedidos_dia(fijos + s.utilidad_objetivo_mensual, c_dollar_i)
            utilidad_al_volumen_base_mensual = (
                c_dollar_i * objetivo_mes - fijos
            )
            sensibilidad.append(
                {
                    "ticket_subtotal": round(ticket, 2),
                    "comision_delivery_pct": round(comision, 4),
                    "contribucion_pct": round(c_pct_i, 4),
                    "contribucion_dollar": round(c_dollar_i, 2),
                    "equilibrio_pedidos_dia": round(equilibrio_i, 1),
                    "objetivo_pedidos_dia": round(objetivo_i, 1),
                    "utilidad_mensual_al_volumen_objetivo_base": round(
                        utilidad_al_volumen_base_mensual, 2
                    ),
                }
            )

    return {
        "origen": "simulado",
        "supuestos": {
            "sueldo_mensual_por_empleado": s.sueldo_mensual_por_empleado,
            "salario_minimo_mensual_2026": round(salario_minimo_mensual, 2),
            "sueldo_cumple_minimo": sueldo_cumple_minimo,
            "factor_carga_social": s.factor_carga_social,
            "renta_mensual": s.renta_mensual,
            "servicios_mensual": s.servicios_mensual,
            "otros_fijos_mensual": s.otros_fijos_mensual,
            "utilidad_objetivo_mensual": s.utilidad_objetivo_mensual,
            "merma_pct": s.merma_pct,
            "comision_delivery_pct": s.comision_delivery_pct,
            "empaque_delivery_por_pedido": s.empaque_delivery_por_pedido,
            "pct_pagos_tarjeta": s.pct_pagos_tarjeta,
            "comision_tarjeta_pct": s.comision_tarjeta_pct,
            "crecimiento_anual": s.crecimiento_anual,
        },
        "medido": {
            "ticket_promedio_subtotal": m.ticket_subtotal,
            "costo_pct_ponderado": m.costo_pct,
            "descuento_pct_ponderado": m.descuento_pct,
            "mix_delivery": m.mix_delivery,
        },
        "resultado": {
            "costos_fijos_mensuales": round(fijos, 2),
            "contribucion_pct": round(c_pct, 4),
            "contribucion_dollar_por_pedido": round(c_dollar, 2),
            "equilibrio_pedidos_dia": round(equilibrio_dia, 1),
            "equilibrio_pedidos_mes": round(equilibrio_dia * DIAS_POR_MES, 1),
            "objetivo_pedidos_dia": round(objetivo_dia, 1),
            "objetivo_pedidos_mes": round(objetivo_mes, 1),
            "ventas_mensuales_objetivo": round(ventas_mensuales_objetivo, 2),
            "margen_operativo_pct": round(margen_operativo_pct, 4),
        },
        "referencia_usuario": {
            "equilibrio_pedidos_dia_esperado": 34,
            "objetivo_pedidos_dia_esperado": 48,
            "ventas_mensuales_esperadas": 190000,
            "margen_operativo_esperado_pct": 0.11,
        },
        "sensibilidad": sensibilidad,
    }


def main() -> None:
    reporte = construir_reporte()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(reporte, indent=2, ensure_ascii=False))

    r = reporte["resultado"]
    sm = reporte["supuestos"]
    print(f"Sueldo {sm['sueldo_mensual_por_empleado']} >= mínimo {sm['salario_minimo_mensual_2026']}: {sm['sueldo_cumple_minimo']}")
    print(f"Costos fijos mensuales: ${r['costos_fijos_mensuales']:,.2f}")
    print(f"Contribución: {r['contribucion_pct']*100:.2f}% = ${r['contribucion_dollar_por_pedido']:.2f}/pedido")
    print(f"Equilibrio: {r['equilibrio_pedidos_dia']} pedidos/día ({r['equilibrio_pedidos_mes']}/mes)")
    print(f"Objetivo:   {r['objetivo_pedidos_dia']} pedidos/día ({r['objetivo_pedidos_mes']}/mes)")
    print(f"Ventas mensuales objetivo: ${r['ventas_mensuales_objetivo']:,.2f}  margen operativo: {r['margen_operativo_pct']*100:.1f}%")
    print(f"Referencia del usuario: equilibrio≈34/día, objetivo≈48/día, ventas≈$190k/mes, margen≈11%")
    print(f"Escrito: {OUT_PATH}")


if __name__ == "__main__":
    main()

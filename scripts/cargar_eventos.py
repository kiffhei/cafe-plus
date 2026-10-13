"""Fase 2.2 — carga analytics/eventos.yaml a bd_eventos_locales + bd_observaciones_dia.

No escribe directo a la base (no hay DATABASE_URL local disponible en este entorno).
Genera el SQL idempotente (ON CONFLICT DO NOTHING) en analytics/out/eventos_insert.sql
para aplicarlo vía el MCP de Supabase o psql.

Los incidentes internos ficticios NO viven en el YAML — se generan aquí, reproducibles
con --seed, para que la selección de fechas sea auditable y no "a mano".
"""

from __future__ import annotations

import argparse
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import yaml

EVENTOS_PATH = Path(__file__).parent.parent / "analytics" / "eventos.yaml"
OUT_PATH = Path(__file__).parent.parent / "analytics" / "out" / "eventos_insert.sql"

TIPOS_INCIDENTE = [
    "falla_equipo",
    "corte_luz",
    "faltante_personal",
    "promocion_2x1",
    "cierre_imprevisto",
]


def _sql_str(v) -> str:
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def _sql_num(v) -> str:
    return "null" if v is None else str(v)


def generar_incidentes_ficticios(desde: date, hasta: date, seed: int, por_anio: int = 6) -> list[dict]:
    rng = np.random.default_rng(seed)
    incidentes = []
    for anio in range(desde.year, hasta.year + 1):
        inicio_anio = max(date(anio, 1, 1), desde)
        fin_anio = min(date(anio, 12, 31), hasta)
        dias_disponibles = (fin_anio - inicio_anio).days
        if dias_disponibles <= 0:
            continue
        n = por_anio if anio != hasta.year else max(1, round(por_anio * dias_disponibles / 365))
        offsets = rng.choice(dias_disponibles, size=min(n, dias_disponibles), replace=False)
        for i, off in enumerate(sorted(offsets)):
            fecha = inicio_anio + timedelta(days=int(off))
            tipo = TIPOS_INCIDENTE[rng.integers(0, len(TIPOS_INCIDENTE))]
            con_causa = bool(rng.integers(0, 2))
            incidentes.append({"fecha": fecha, "tipo": tipo, "con_causa": con_causa})
    return incidentes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--desde", type=str, default="2025-01-01")
    parser.add_argument("--hasta", type=str, default=str(date.today()))
    args = parser.parse_args()

    desde = date.fromisoformat(args.desde)
    hasta = date.fromisoformat(args.hasta)

    data = yaml.safe_load(EVENTOS_PATH.read_text())
    tipos_incidente_cfg = data["incidentes_tipos"]

    lineas_eventos = []
    lineas_observaciones = []

    for ev in data["eventos"]:
        lineas_eventos.append(
            "insert into bd_eventos_locales "
            "(id, nombre, tipo, inicio, fin, hora_inicio_efecto, hora_fin_efecto, "
            "mult_local, mult_delivery, confianza, fuente_url, observacion) values ("
            f"{_sql_str(ev['id'])}, {_sql_str(ev['nombre'])}, {_sql_str(ev['tipo'])}, "
            f"{_sql_str(ev['inicio'])}, {_sql_str(ev['fin'])}, "
            f"{ev['horas_efecto'][0]}, {ev['horas_efecto'][1]}, "
            f"{_sql_num(ev['mult_local'])}, {_sql_num(ev['mult_delivery'])}, "
            f"{_sql_str(ev['confianza'])}, {_sql_str(ev.get('fuente_url'))}, "
            f"{_sql_str(ev.get('observacion'))}) on conflict (id) do nothing;"
        )
        if ev.get("recurrencia"):
            continue  # eventos recurrentes (ej. tianguis semanal) no tienen "un día" para bd_observaciones_dia
        if ev.get("observacion") and ev["confianza"] in ("verificado", "patron"):
            texto = f"{ev['nombre']}: {ev['observacion'][:200]}"
            fecha_obs = ev["inicio"]
            lineas_observaciones.append(
                "insert into bd_observaciones_dia (fecha, texto, tipo, evento_id, confianza, fuente_url) "
                f"values ({_sql_str(fecha_obs)}, {_sql_str(texto)}, {_sql_str(ev['tipo'])}, "
                f"{_sql_str(ev['id'])}, {_sql_str(ev['confianza'])}, {_sql_str(ev.get('fuente_url'))}) "
                "on conflict (fecha) do nothing;"
            )
        elif ev["confianza"] == "verificado":
            texto = ev["nombre"]
            lineas_observaciones.append(
                "insert into bd_observaciones_dia (fecha, texto, tipo, evento_id, confianza, fuente_url) "
                f"values ({_sql_str(ev['inicio'])}, {_sql_str(texto)}, {_sql_str(ev['tipo'])}, "
                f"{_sql_str(ev['id'])}, {_sql_str(ev['confianza'])}, {_sql_str(ev.get('fuente_url'))}) "
                "on conflict (fecha) do nothing;"
            )

    incidentes = generar_incidentes_ficticios(desde, hasta, args.seed)
    for i, inc in enumerate(incidentes):
        cfg = tipos_incidente_cfg[inc["tipo"]]
        ev_id = f"inc-{inc['fecha'].isoformat()}-{inc['tipo']}"
        nombre = f"Incidente interno ficticio: {inc['tipo']}"
        lineas_eventos.append(
            "insert into bd_eventos_locales "
            "(id, nombre, tipo, inicio, fin, hora_inicio_efecto, hora_fin_efecto, "
            "mult_local, mult_delivery, confianza, fuente_url, observacion) values ("
            f"{_sql_str(ev_id)}, {_sql_str(nombre)}, {_sql_str('incidente_interno')}, "
            f"{_sql_str(inc['fecha'])}, {_sql_str(inc['fecha'])}, "
            f"{cfg['horas_efecto'][0]}, {cfg['horas_efecto'][1]}, "
            f"{_sql_num(cfg['mult_local'])}, {_sql_num(cfg['mult_delivery'])}, "
            f"{_sql_str('supuesto')}, null, "
            f"{_sql_str('Negocio simulado, sin fuente. causa_conocida=' + str(inc['con_causa']))}) "
            "on conflict (id) do nothing;"
        )
        if inc["con_causa"]:
            lineas_observaciones.append(
                "insert into bd_observaciones_dia (fecha, texto, tipo, evento_id, confianza, fuente_url) "
                f"values ({_sql_str(inc['fecha'])}, "
                f"{_sql_str('Incidente interno (' + inc['tipo'] + '), supuesto')}, "
                f"{_sql_str('incidente_interno')}, {_sql_str(ev_id)}, {_sql_str('supuesto')}, null) "
                "on conflict (fecha) do nothing;"
            )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    sql = "\n".join(lineas_eventos + lineas_observaciones) + "\n"
    OUT_PATH.write_text(sql)

    print(f"{len(data['eventos'])} eventos del calendario curado + {len(incidentes)} incidentes ficticios (seed={args.seed})")
    print(f"{len(lineas_observaciones)} observaciones de día")
    print(f"SQL escrito en {OUT_PATH} — aplicar vía MCP de Supabase o psql.")


if __name__ == "__main__":
    main()

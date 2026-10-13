"""Fase 2.3 — re-horario de pedidos existentes en bd_ventas.

CLI: python scripts/retime_pedidos.py --seed 42 [--apply] [--revert]
Dry-run por defecto. Requiere DATABASE_URL en .env.local (psycopg) para conectar
directo a Postgres. En sesiones donde la conexión directa no está disponible pero el
MCP de Supabase sí, usar las funciones puras de este módulo (calcular_fecha_logica,
calcular_nueva_fecha_hora, construir_reporte_dry_run) desde un driver que hable con el
MCP — ver docs/FASE2_RETIME.md para cómo se hizo en esa sesión.

Reglas duras que este script respeta:
  - Solo UPDATE de fecha_hora. Nunca toca es_sintetico, id_pedido, detalle, montos,
    canal, estado, cliente, cajero.
  - Nunca DELETE.
  - Respaldo bd_ventas_retime_bak_YYYYMMDD(id_pedido, fecha_hora_anterior, fecha_logica)
    con TODAS las filas antes de cualquier UPDATE, verificado contra el conteo real.
  - Ningún timestamp en el futuro — el día en curso solo con horas ya transcurridas.
"""

from __future__ import annotations

import argparse
import os
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent))
from perfil import HORAS, muestrear_hora_minuto_segundo, tipo_dia, VENTANA_LUNVIE, VENTANA_SABDOM, BANDA_LUNVIE, BANDA_SABDOM, HORA_IDX

TZ_CDMX = ZoneInfo("America/Mexico_City")
TZ_UTC = timezone.utc


@dataclass(frozen=True)
class Pedido:
    id_pedido: str
    fecha_hora_actual: datetime  # tz-aware, UTC, tal como está en bd_ventas
    es_sintetico: bool
    canal: str
    tiene_sandwich: bool


def calcular_fecha_logica(p: Pedido) -> date:
    """Regla de Fase 0: si es_sintetico=false, la fecha lógica es la fecha UTC cruda
    de fecha_hora (recupera el día real de las filas con el desfase de +0h/-6h mal
    etiquetado). Si es_sintetico=true, la fecha lógica es la fecha en CDMX (esas filas
    sí se escribieron con timezone correcto, vía default now())."""
    if not p.es_sintetico:
        return p.fecha_hora_actual.astimezone(TZ_UTC).date()
    return p.fecha_hora_actual.astimezone(TZ_CDMX).date()


def calcular_nueva_fecha_hora(
    p: Pedido,
    seed_global: int,
    ahora_cdmx: datetime,
) -> datetime:
    fecha_logica = calcular_fecha_logica(p)
    es_hoy = fecha_logica == ahora_cdmx.date()

    if not es_hoy:
        hora, minuto, segundo = muestrear_hora_minuto_segundo(
            fecha_logica, p.id_pedido, seed_global, p.tiene_sandwich, p.canal
        )
    else:
        hora_limite = ahora_cdmx.hour
        horas_validas = [h for h in HORAS if h <= hora_limite]
        if not horas_validas:
            horas_validas = [HORAS[0]]
        hora, minuto, segundo = muestrear_hora_minuto_segundo(
            fecha_logica, p.id_pedido, seed_global, p.tiene_sandwich, p.canal
        )
        if hora not in horas_validas:
            # recorta al soporte válido determinísticamente (mismo seed -> misma hora)
            idx = hash((seed_global, p.id_pedido, "clip")) % len(horas_validas)
            hora = horas_validas[idx]
        if hora == hora_limite and minuto * 60 + segundo > ahora_cdmx.minute * 60 + ahora_cdmx.second:
            minuto, segundo = ahora_cdmx.minute, ahora_cdmx.second

    nueva_local = datetime(
        fecha_logica.year, fecha_logica.month, fecha_logica.day,
        hora, minuto, segundo, tzinfo=TZ_CDMX,
    )
    return nueva_local.astimezone(TZ_UTC)


def construir_reporte_dry_run(pedidos: list[Pedido], seed_global: int, ahora_cdmx: datetime) -> dict:
    antes_hist = Counter()
    despues_hist = Counter()
    fuera_de_horario_hoy = 0
    nuevas_fechas: dict[str, datetime] = {}

    for p in pedidos:
        if p.es_sintetico:
            hora_actual_cdmx = p.fecha_hora_actual.astimezone(TZ_CDMX).hour
        else:
            hora_actual_cdmx = p.fecha_hora_actual.astimezone(TZ_UTC).hour
        antes_hist[hora_actual_cdmx] += 1

        nueva = calcular_nueva_fecha_hora(p, seed_global, ahora_cdmx)
        nuevas_fechas[p.id_pedido] = nueva
        nueva_cdmx = nueva.astimezone(TZ_CDMX)
        despues_hist[nueva_cdmx.hour] += 1

        fecha_logica = calcular_fecha_logica(p)
        if fecha_logica == ahora_cdmx.date() and nueva > ahora_cdmx:
            fuera_de_horario_hoy += 1

    total = len(pedidos)
    concentracion_lunvie = sum(
        despues_hist[h] for h in (6, 7, 8)
    ) / sum(1 for p in pedidos if tipo_dia(calcular_fecha_logica(p)) == "entre_semana") if any(
        tipo_dia(calcular_fecha_logica(p)) == "entre_semana" for p in pedidos
    ) else 0.0

    n_semana = sum(1 for p in pedidos if tipo_dia(calcular_fecha_logica(p)) == "entre_semana")
    n_finde = sum(1 for p in pedidos if tipo_dia(calcular_fecha_logica(p)) == "fin_semana")
    c_lunvie_despues = Counter()
    c_sabdom_despues = Counter()
    for p in pedidos:
        nueva_cdmx = nuevas_fechas[p.id_pedido].astimezone(TZ_CDMX)
        td = tipo_dia(calcular_fecha_logica(p))
        if td == "entre_semana":
            c_lunvie_despues[nueva_cdmx.hour] += 1
        else:
            c_sabdom_despues[nueva_cdmx.hour] += 1

    conc_lunvie = sum(c_lunvie_despues[h] for h in (6, 7, 8)) / n_semana if n_semana else 0.0
    conc_sabdom = sum(c_sabdom_despues[h] for h in (9, 10, 11, 12)) / n_finde if n_finde else 0.0

    return {
        "total_pedidos": total,
        "fuera_de_horario_futuro": fuera_de_horario_hoy,
        "histograma_antes_cdmx": dict(sorted(antes_hist.items())),
        "histograma_despues_cdmx": dict(sorted(despues_hist.items())),
        "concentracion_lunvie_06_09": round(conc_lunvie, 4),
        "banda_lunvie_objetivo": BANDA_LUNVIE,
        "concentracion_sabdom_09_13": round(conc_sabdom, 4),
        "banda_sabdom_objetivo": BANDA_SABDOM,
        "nuevas_fechas": nuevas_fechas,
    }


def _conectar_db():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL no está en .env.local. Esta sesión no tiene la contraseña "
            "directa de Postgres — el re-horario de hoy se hizo vía el MCP de Supabase, "
            "reusando calcular_fecha_logica/calcular_nueva_fecha_hora de este módulo. "
            "Para correr este script standalone, agrega DATABASE_URL a .env.local."
        )
    import psycopg
    return psycopg.connect(url)


def cargar_pedidos_desde_db(conn) -> list[Pedido]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select v.id_pedido, v.fecha_hora, v.es_sintetico, v.canal,
                   bool_or(p.categoria = 'sandwich') as tiene_sandwich
            from bd_ventas v
            left join bd_detalle_pedidos d on d.id_pedido = v.id_pedido
            left join bd_productos p on p.id_producto = d.id_producto
            group by v.id_pedido, v.fecha_hora, v.es_sintetico, v.canal
            """
        )
        filas = cur.fetchall()
    return [
        Pedido(
            id_pedido=r[0],
            fecha_hora_actual=r[1],
            es_sintetico=r[2],
            canal=r[3],
            tiene_sandwich=bool(r[4]),
        )
        for r in filas
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()

    ahora_cdmx = datetime.now(TZ_CDMX)
    conn = _conectar_db()

    if args.revert:
        hoy = date.today().strftime("%Y%m%d")
        with conn.cursor() as cur:
            cur.execute("begin;")
            cur.execute(
                f"""
                update bd_ventas v set fecha_hora = b.fecha_hora_anterior
                from bd_ventas_retime_bak_{hoy} b
                where v.id_pedido = b.id_pedido;
                """
            )
            print(f"Revert aplicado desde bd_ventas_retime_bak_{hoy}: {cur.rowcount} filas.")
            cur.execute("commit;")
        return

    pedidos = cargar_pedidos_desde_db(conn)
    reporte = construir_reporte_dry_run(pedidos, args.seed, ahora_cdmx)

    print(f"Total pedidos: {reporte['total_pedidos']}")
    print(f"Fuera de horario / futuro (debe ser 0 tras aplicar): {reporte['fuera_de_horario_futuro']}")
    print(f"Histograma ANTES (hora CDMX): {reporte['histograma_antes_cdmx']}")
    print(f"Histograma DESPUÉS (hora CDMX): {reporte['histograma_despues_cdmx']}")
    print(f"Concentración lun-vie 06-09: {reporte['concentracion_lunvie_06_09']} (objetivo {reporte['banda_lunvie_objetivo']})")
    print(f"Concentración sáb-dom 09-13: {reporte['concentracion_sabdom_09_13']} (objetivo {reporte['banda_sabdom_objetivo']})")

    if not args.apply:
        print("\nDRY-RUN — no se escribió nada. Corre con --apply para aplicar.")
        return

    hoy = date.today().strftime("%Y%m%d")
    with conn.cursor() as cur:
        cur.execute("begin;")
        cur.execute(
            f"""
            create table bd_ventas_retime_bak_{hoy} as
            select id_pedido, fecha_hora as fecha_hora_anterior, fecha_hora as fecha_logica
            from bd_ventas where false;
            """
        )
        for p in pedidos:
            cur.execute(
                f"insert into bd_ventas_retime_bak_{hoy} (id_pedido, fecha_hora_anterior, fecha_logica) "
                "values (%s, %s, %s)",
                (p.id_pedido, p.fecha_hora_actual, calcular_fecha_logica(p)),
            )
        cur.execute(f"select count(*) from bd_ventas_retime_bak_{hoy}")
        n_bak = cur.fetchone()[0]
        cur.execute("select count(*) from bd_ventas")
        n_ventas = cur.fetchone()[0]
        if n_bak != n_ventas:
            cur.execute("rollback;")
            raise RuntimeError(f"Respaldo ({n_bak}) no coincide con bd_ventas ({n_ventas}) — abortado.")

        nuevas = reporte["nuevas_fechas"]
        for id_pedido, nueva_fecha in nuevas.items():
            cur.execute(
                "update bd_ventas set fecha_hora = %s where id_pedido = %s",
                (nueva_fecha, id_pedido),
            )
        cur.execute("commit;")
        print(f"\nAplicado: {len(nuevas)} filas actualizadas. Respaldo: bd_ventas_retime_bak_{hoy} ({n_bak} filas).")


if __name__ == "__main__":
    main()

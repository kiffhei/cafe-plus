"""Fase 4 — nuevo autogenerador de pedidos sintéticos para Café Plus.

Reemplaza el cron de 20 min que vivía en pg_cron/plpgsql dentro del propio proyecto de
Supabase (detenido permanentemente el 2026-10-14 por instrucción explícita del
usuario — ver docs/FASE0_RECONOCIMIENTO.md). La sustitución NO tocó app/n8n/Apps
Script (Regla 8b no se activó: el generador viejo vivía 100% en Supabase).

Diferencias clave contra el generador viejo:
  - Usa scripts/perfil.py como ÚNICA fuente de verdad de horario/afinidades — el cron
    viejo guardaba la hora local como si fuera UTC (ver FASE0), por eso el patrón
    quedaba uniforme 0-14h con huecos 15-22h. Este nunca produce esa distorsión porque
    muestrea directamente en CDMX con tz-aware datetimes.
  - Volumen objetivo ≈47.8 pedidos/día (analytics/out/economia.json, Fase 1), no un
    ritmo fijo de "cada 20 minutos" (eso daba ~60-72/día uniforme, sin variación por
    día de semana/mes/eventos).
  - Mezcla de canal/categoría/cantidad por línea/cancelación/cliente: todos medidos de
    bd_ventas/bd_detalle_pedidos reales (es_sintetico=false) — ver analytics/config.yaml
    bloque `medido`. Cero valores de mezcla fueron adivinados.
  - Jamás escribe a bd_productos ni bd_clientes (Regla 3): no hay triggers en
    bd_detalle_pedidos/bd_productos/bd_clientes (verificado en Fase 3 — pg_trigger vacío
    para esas tres tablas), así que cantidad_stock y visitas_acumuladas quedan
    exactamente como estaban sin necesidad de deshabilitar nada.
  - --revert NO borra nada. Regla 1 ("nunca DELETE de bd_ventas/bd_detalle_pedidos") es
    absoluta y no tiene excepción para filas que este mismo script insertó. Si se pasa
    --revert, el script explica esto y termina sin tocar la base de datos.

CLI:
  python scripts/seed_sinteticos.py --fecha 2026-10-15                  # dry-run
  python scripts/seed_sinteticos.py --desde 2026-09-01 --hasta 2026-09-30 --apply
  python scripts/seed_sinteticos.py --revert                            # explica por qué no aplica
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import yaml

sys.path.insert(0, str(Path(__file__).parent))
from perfil import (
    HORAS,
    SHARE_SANDWICH,
    cajero_en_turno,
    factor_dow,
    factor_mensual,
    muestrear_hora_minuto_segundo,
)

TZ_CDMX = ZoneInfo("America/Mexico_City")
TZ_UTC = timezone.utc
CONFIG_PATH = Path(__file__).parent.parent / "analytics" / "config.yaml"

# Catálogo de productos (Regla 3: nunca se escribe aquí, solo se lee para construir el
# detalle del pedido). Copiado de bd_productos — 18 SKUs, sin cantidad_stock porque este
# script jamás la toca ni la necesita.
PRODUCTOS = {
    "cafe": [
        ("PRD-001", "Café Americano", 35.00),
        ("PRD-002", "Café Latte", 45.00),
        ("PRD-003", "Cappuccino", 48.00),
        ("PRD-004", "Café Frío", 50.00),
        ("PRD-005", "Café Espresso", 30.00),
        ("PRD-006", "Frappé Caramelo", 58.00),
    ],
    "bebida": [
        ("PRD-007", "Chocolate Caliente", 42.00),
        ("PRD-008", "Té Verde", 38.00),
        ("PRD-009", "Agua Natural 500ml", 20.00),
    ],
    "pan": [
        ("PRD-010", "Croissant", 32.00),
        ("PRD-011", "Muffin Chocolate", 35.00),
        ("PRD-012", "Muffin Blueberry", 35.00),
        ("PRD-013", "Pan de Elote", 28.00),
        ("PRD-014", "Pan de Nuez", 30.00),
    ],
    "sandwich": [
        ("PRD-015", "Sandwich Jamón", 55.00),
        ("PRD-016", "Sandwich Caprese", 62.00),
        ("PRD-017", "Club Sandwich", 68.00),
        ("PRD-018", "Sandwich Pollo BBQ", 65.00),
    ],
}

CLIENTES = ["CLI-001", "CLI-002", "CLI-003", "CLI-004", "CLI-005", "CLI-006", "CLI-007", "CLI-008", "CLI-009"]
CAJEROS_NOMBRE = {"USR-002": "Cajero Matutino", "USR-003": "Cajero Vespertino"}


def cargar_mix() -> dict:
    cfg = yaml.safe_load(CONFIG_PATH.read_text())
    return cfg["medido"]


EVENTOS_PATH = Path(__file__).parent.parent / "analytics" / "eventos.yaml"

# Incidentes internos ficticios ya aplicados a bd_observaciones_dia en Fase 2.2
# (scripts/cargar_eventos.py, generar_incidentes_ficticios(), seed=42). Se copian aquí
# en vez de volver a generarlos porque son el registro YA PERSISTIDO, auditable vía
# `select * from bd_observaciones_dia where tipo='incidente_interno'` — generar_incidentes_
# ficticios() podría drift si algún día cambia; esta lista es la verdad ya escrita.
INCIDENTES_APLICADOS = [
    (date(2025, 2, 2), "cierre_imprevisto"),
    (date(2025, 6, 7), "promocion_2x1"),
    (date(2025, 6, 8), "promocion_2x1"),
    (date(2025, 8, 25), "falla_equipo"),
    (date(2025, 10, 6), "faltante_personal"),
    (date(2026, 4, 24), "falla_equipo"),
    (date(2026, 8, 8), "cierre_imprevisto"),
    (date(2026, 8, 22), "corte_luz"),
    (date(2026, 9, 17), "falla_equipo"),
]


def _cargar_eventos_yaml() -> dict:
    return yaml.safe_load(EVENTOS_PATH.read_text())


def eventos_activos(fecha: date) -> list[dict]:
    """Eventos (externos + incidentes internos) activos en `fecha`, con su multiplicador.
    Cada entrada: {evento_id, tipo, mult_local, mult_delivery, hora_inicio, hora_fin,
    causa_conocida}. causa_conocida=True siempre aquí porque esta función solo devuelve
    anomalías que NOSOTROS inyectamos a propósito (nunca una desviación real sin causa
    conocida — eso lo decidiría el algoritmo de detección de Fase 6, no el generador)."""
    cfg = _cargar_eventos_yaml()
    activos = []

    for ev in cfg["eventos"]:
        inicio, fin = ev["inicio"], ev["fin"]
        aplica = False
        if ev.get("recurrencia") == "martes":
            aplica = inicio <= fecha <= fin and fecha.weekday() == 1
        else:
            aplica = inicio <= fecha <= fin
        if aplica:
            mult_local = ev["mult_local"]
            if ev.get("mult_local_sabdom") and fecha.weekday() >= 5:
                mult_local = ev["mult_local_sabdom"]
            h_ini, h_fin = ev.get("horas_efecto", [6, 20])
            activos.append({
                "evento_id": ev["id"], "tipo": ev["tipo"],
                "mult_local": mult_local, "mult_delivery": ev["mult_delivery"],
                "hora_inicio": h_ini, "hora_fin": h_fin, "causa_conocida": True,
            })

    for fecha_inc, tipo_inc in INCIDENTES_APLICADOS:
        if fecha_inc == fecha:
            params = cfg["incidentes_tipos"][tipo_inc]
            h_ini, h_fin = params["horas_efecto"]
            activos.append({
                "evento_id": f"inc-{fecha.isoformat()}-{tipo_inc}", "tipo": "incidente_interno",
                "mult_local": params["mult_local"], "mult_delivery": params["mult_delivery"],
                "hora_inicio": h_ini, "hora_fin": h_fin, "causa_conocida": True,
            })

    return activos


def multiplicador_dia(fecha: date, share_local: float, share_delivery: float) -> tuple[float, float, float]:
    """Combina (producto) todos los eventos activos de `fecha`. Devuelve
    (mult_local_compuesto, mult_delivery_compuesto, mult_volumen_compuesto) — el tercero
    es el promedio ponderado por share de canal, usado para escalar el volumen total del
    día (Regla 7: el multiplicador es siempre SUPUESTO, pero la mezcla local/share ya es
    medida — ver analytics/config.yaml)."""
    mult_local = mult_delivery = 1.0
    for ev in eventos_activos(fecha):
        mult_local *= ev["mult_local"]
        mult_delivery *= ev["mult_delivery"]
    mult_volumen = share_local * mult_local + share_delivery * mult_delivery
    return mult_local, mult_delivery, mult_volumen


@dataclass
class LineaPedido:
    id_producto: str
    nombre_producto: str
    cantidad: int
    precio_unitario: float

    @property
    def subtotal_linea(self) -> float:
        return round(self.cantidad * self.precio_unitario, 2)


@dataclass
class PedidoGenerado:
    id_pedido: str
    fecha_hora: datetime  # tz-aware UTC
    id_cajero: str
    nombre_cajero: str
    id_cliente: str | None
    canal: str
    estado: str
    lineas: list[LineaPedido] = field(default_factory=list)

    @property
    def subtotal(self) -> float:
        return round(sum(l.subtotal_linea for l in self.lineas), 2)

    @property
    def descuento(self) -> float:
        return 0.0  # calculado aparte en generar_pedido (depende de descuento_fijo del cliente)

    @property
    def total(self) -> float:
        return round(self.subtotal - self.descuento, 2)


def _seed_rng(seed_global: int, *partes: str) -> np.random.Generator:
    clave = ":".join([str(seed_global), *partes])
    semilla = int(hashlib.sha256(clave.encode()).hexdigest()[:8], 16)
    return np.random.default_rng(semilla)


def numero_pedidos_dia(fecha: date, seed_global: int, objetivo_base: float, mult_volumen: float = 1.0) -> int:
    """Volumen del día: objetivo base (Fase 1, economia.py) * factor_dow * factor_mensual
    * mult_volumen (eventos/incidentes de ese día, Fase 6 — ver multiplicador_dia), con
    ruido Poisson (no determinista en el conteo exacto, sí en todo lo demás)."""
    lam = objetivo_base * factor_dow(fecha) * factor_mensual(fecha) * mult_volumen
    rng = _seed_rng(seed_global, fecha.isoformat(), "n_pedidos")
    if lam <= 0:
        return 0  # cierre_imprevisto u otro evento con mult_volumen=0: día sin pedidos, real
    return max(1, int(rng.poisson(lam)))


def elegir_canal(rng: np.random.Generator, mix_canal: dict, mult_local: float = 1.0, mult_delivery: float = 1.0) -> str:
    canales = list(mix_canal.keys())
    pesos = np.array([
        mix_canal[c]["pct"] * (mult_local if c == "local" else mult_delivery) for c in canales
    ])
    pesos = pesos / pesos.sum()
    return str(rng.choice(canales, p=pesos))


def elegir_cliente(rng: np.random.Generator, canal: str, mix_canal: dict) -> str | None:
    pct_con_cliente = mix_canal.get(canal, {}).get("pct_con_cliente")
    if pct_con_cliente is None:
        pct_con_cliente = 0.44  # fallback al promedio global medido si el canal no trae su propio pct
    if rng.random() < pct_con_cliente:
        return str(rng.choice(CLIENTES))
    return None


def elegir_basket(rng: np.random.Generator, mix: dict) -> tuple[list[LineaPedido], bool]:
    tiene_sandwich = rng.random() < SHARE_SANDWICH

    mix_lineas = mix["mix_lineas_por_pedido"]
    pesos_lineas = np.array([mix_lineas[1], mix_lineas[2], mix_lineas[3]])
    pesos_lineas = pesos_lineas / pesos_lineas.sum()  # "otro" (basket >3, 0.04%) se reparte prop.
    n_lineas = int(rng.choice([1, 2, 3], p=pesos_lineas))

    mix_cat = dict(mix["mix_categoria"])
    if tiene_sandwich:
        otras_cats = {k: v for k, v in mix_cat.items() if k != "sandwich"}
        suma = sum(otras_cats.values())
        otras_cats = {k: v / suma for k, v in otras_cats.items()}
    else:
        mix_cat.pop("sandwich", None)
        suma = sum(mix_cat.values())
        otras_cats = {k: v / suma for k, v in mix_cat.items()}

    mix_cant = mix["mix_cantidad_por_linea"]
    pesos_cant = np.array([mix_cant[1], mix_cant[2], mix_cant[3]])
    pesos_cant = pesos_cant / pesos_cant.sum()

    lineas: list[LineaPedido] = []
    n_restantes = n_lineas
    if tiene_sandwich:
        id_p, nombre, precio = PRODUCTOS["sandwich"][rng.integers(0, len(PRODUCTOS["sandwich"]))]
        cantidad = int(rng.choice([1, 2, 3], p=pesos_cant))
        lineas.append(LineaPedido(id_p, nombre, cantidad, precio))
        n_restantes -= 1

    cats_restantes = list(otras_cats.keys())
    pesos_restantes = np.array(list(otras_cats.values()))
    pesos_restantes = pesos_restantes / pesos_restantes.sum()
    for _ in range(n_restantes):
        cat = rng.choice(cats_restantes, p=pesos_restantes)
        catalogo = PRODUCTOS[cat]
        id_p, nombre, precio = catalogo[rng.integers(0, len(catalogo))]
        cantidad = int(rng.choice([1, 2, 3], p=pesos_cant))
        lineas.append(LineaPedido(id_p, nombre, cantidad, precio))

    return lineas, tiene_sandwich


def generar_pedido(
    id_pedido: str,
    fecha: date,
    seed_global: int,
    mix: dict,
    clientes_descuento: dict[str, float],
    mult_local: float = 1.0,
    mult_delivery: float = 1.0,
) -> PedidoGenerado:
    # Salt distinto a perfil._seed_pedido("{seed}:{id_pedido}") a propósito: si este rng
    # y el que usa internamente muestrear_hora_minuto_segundo compartieran semilla, sus
    # primeros sorteos (canal aquí, hora allá) quedarían correlacionados por el mismo
    # cuantil uniforme subyacente — un bug real que se detectó en el dry-run de Fase 5
    # (canal y hora salían perfectamente separados, 100%/0%, para un mismo día).
    rng = _seed_rng(seed_global, id_pedido, "canal_basket")

    canal = elegir_canal(rng, mix["mix_canal"], mult_local, mult_delivery)
    cliente = elegir_cliente(rng, canal, mix["mix_canal"])
    lineas, tiene_sandwich = elegir_basket(rng, mix)

    canal_tipo = "local" if canal == "local" else "delivery"
    hora, minuto, segundo = muestrear_hora_minuto_segundo(
        fecha, id_pedido, seed_global, tiene_sandwich, canal_tipo
    )
    fecha_local = datetime(fecha.year, fecha.month, fecha.day, hora, minuto, segundo, tzinfo=TZ_CDMX)
    fecha_utc = fecha_local.astimezone(TZ_UTC)

    id_cajero = cajero_en_turno(hora, int(hashlib.sha256(f"{seed_global}:{id_pedido}:cajero".encode()).hexdigest()[:8], 16))

    pct_cancelado = mix["mix_canal"].get(canal, {}).get("pct_cancelado", mix["pct_cancelado_global"])
    estado = "cancelado" if rng.random() < pct_cancelado else "entregado"

    pedido = PedidoGenerado(
        id_pedido=id_pedido,
        fecha_hora=fecha_utc,
        id_cajero=id_cajero,
        nombre_cajero=CAJEROS_NOMBRE[id_cajero],
        id_cliente=cliente,
        canal=canal,
        estado=estado,
        lineas=lineas,
    )

    descuento_pct = clientes_descuento.get(cliente, 0.0) if cliente else 0.0
    pedido.__dict__["_descuento"] = round(pedido.subtotal * descuento_pct / 100.0, 2)
    return pedido


def descuento_de(p: PedidoGenerado) -> float:
    return p.__dict__.get("_descuento", 0.0)


def total_de(p: PedidoGenerado) -> float:
    return round(p.subtotal - descuento_de(p), 2)


def siguiente_id_pedido_local(max_actual: int, offset: int) -> str:
    return f"PED-{max_actual + offset:05d}"


def generar_lote(
    fecha_inicio: date,
    fecha_fin: date,
    seed_global: int,
    max_id_actual: int,
    mix: dict,
    clientes_descuento: dict[str, float],
    ahora_cdmx: datetime | None = None,
) -> tuple[list[PedidoGenerado], list[dict]]:
    """Genera pedidos para [fecha_inicio, fecha_fin] inclusive. Si ahora_cdmx se da y
    fecha_fin == ahora_cdmx.date(), solo genera horas ya transcurridas (Regla 5).
    Devuelve (pedidos, anomalias_verdad) — el segundo es la lista de filas a insertar en
    bd_anomalias_verdad: un registro por (día, evento activo), la verdad-terreno que
    Fase 6 usa para medir precision/recall del detector de anomalías sin ver el código
    del generador."""
    objetivo_base = mix["objetivo_pedidos_dia"]
    share_local = mix["mix_canal"]["local"]["pct"]
    share_delivery = 1.0 - share_local
    pedidos: list[PedidoGenerado] = []
    anomalias: list[dict] = []
    offset = 1
    dia = fecha_inicio
    while dia <= fecha_fin:
        mult_local, mult_delivery, mult_volumen = multiplicador_dia(dia, share_local, share_delivery)
        for ev in eventos_activos(dia):
            anomalias.append({
                "fecha": dia.isoformat(), "tipo": ev["tipo"],
                "mult_aplicado": round((mult_local + mult_delivery) / 2, 4),
                "hora_inicio": ev["hora_inicio"], "hora_fin": ev["hora_fin"],
                "causa_conocida": ev["causa_conocida"], "evento_id": ev["evento_id"],
            })

        n = numero_pedidos_dia(dia, seed_global, objetivo_base, mult_volumen)
        for _ in range(n):
            id_pedido = siguiente_id_pedido_local(max_id_actual, offset)
            offset += 1
            p = generar_pedido(id_pedido, dia, seed_global, mix, clientes_descuento, mult_local, mult_delivery)
            if ahora_cdmx and dia == ahora_cdmx.date() and p.fecha_hora.astimezone(TZ_CDMX) > ahora_cdmx:
                continue  # Regla 5: nunca futuro
            pedidos.append(p)
        dia += timedelta(days=1)
    return pedidos, anomalias


def construir_reporte_dry_run(pedidos: list[PedidoGenerado]) -> dict:
    from collections import Counter

    por_dia = Counter()
    por_canal = Counter()
    por_estado = Counter()
    hist_hora = Counter()
    for p in pedidos:
        fh_cdmx = p.fecha_hora.astimezone(TZ_CDMX)
        por_dia[fh_cdmx.date().isoformat()] += 1
        por_canal[p.canal] += 1
        por_estado[p.estado] += 1
        hist_hora[fh_cdmx.hour] += 1

    futuras = sum(1 for p in pedidos if p.fecha_hora > datetime.now(TZ_UTC))
    fuera_horario = sum(
        1 for p in pedidos if not (6 <= p.fecha_hora.astimezone(TZ_CDMX).hour <= 20)
    )

    return {
        "total_pedidos": len(pedidos),
        "dias_generados": len(por_dia),
        "promedio_por_dia": round(len(pedidos) / max(1, len(por_dia)), 2),
        "futuras": futuras,
        "fuera_de_horario": fuera_horario,
        "por_canal": dict(por_canal),
        "por_estado": dict(por_estado),
        "histograma_hora_cdmx": dict(sorted(hist_hora.items())),
    }


def _conectar_db():
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent.parent / ".env.local")
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL no está en .env.local. Para aplicar sin psycopg, usar las "
            "funciones puras de este módulo (generar_lote, construir_reporte_dry_run) "
            "desde un driver que hable con el MCP de Supabase — ver docs/FASE4_GENERADOR.md."
        )
    import psycopg

    return psycopg.connect(url)


def obtener_max_id_pedido(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("select max(id_pedido) from bd_ventas")
        (max_id,) = cur.fetchone()
    return int(max_id.split("-")[1]) if max_id else 0


def insertar_lote(conn, pedidos: list[PedidoGenerado]) -> None:
    with conn.cursor() as cur:
        cur.execute("begin;")
        for p in pedidos:
            cur.execute(
                """
                insert into bd_ventas
                  (id_pedido, fecha_hora, id_cajero, nombre_cajero, id_cliente, canal,
                   subtotal, descuento, total, estado, es_sintetico)
                values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, true)
                """,
                (
                    p.id_pedido, p.fecha_hora, p.id_cajero, p.nombre_cajero, p.id_cliente,
                    p.canal, p.subtotal, descuento_de(p), total_de(p), p.estado,
                ),
            )
            for linea in p.lineas:
                cur.execute(
                    """
                    insert into bd_detalle_pedidos
                      (id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, subtotal_linea)
                    values (%s,%s,%s,%s,%s,%s)
                    """,
                    (p.id_pedido, linea.id_producto, linea.nombre_producto, linea.cantidad,
                     linea.precio_unitario, linea.subtotal_linea),
                )
        cur.execute("commit;")


def insertar_anomalias(conn, anomalias: list[dict]) -> None:
    with conn.cursor() as cur:
        cur.execute("begin;")
        for a in anomalias:
            cur.execute(
                """
                insert into bd_anomalias_verdad
                  (fecha, tipo, mult_aplicado, hora_inicio, hora_fin, causa_conocida, evento_id)
                values (%s,%s,%s,%s,%s,%s,%s)
                """,
                (a["fecha"], a["tipo"], a["mult_aplicado"], a["hora_inicio"], a["hora_fin"],
                 a["causa_conocida"], a["evento_id"]),
            )
        cur.execute("commit;")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fecha", type=str, help="Un solo día, YYYY-MM-DD")
    parser.add_argument("--desde", type=str, help="Inicio de rango, YYYY-MM-DD")
    parser.add_argument("--hasta", type=str, help="Fin de rango, YYYY-MM-DD")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()

    if args.revert:
        print(
            "No hay --revert real en este script. Regla 1 ('nunca DELETE de bd_ventas / "
            "bd_detalle_pedidos') no tiene excepción para filas que este mismo generador "
            "insertó. Si un lote se insertó por error, documentarlo en "
            "docs/FASE4_GENERADOR.md y decidir manualmente con el usuario — este script "
            "nunca emitirá un DELETE."
        )
        return

    if args.fecha:
        fecha_inicio = fecha_fin = date.fromisoformat(args.fecha)
    elif args.desde and args.hasta:
        fecha_inicio, fecha_fin = date.fromisoformat(args.desde), date.fromisoformat(args.hasta)
    else:
        parser.error("Especifica --fecha o --desde/--hasta")
        return

    mix = cargar_mix()
    clientes_descuento = {
        "CLI-001": 10.0, "CLI-002": 10.0, "CLI-003": 0.0, "CLI-004": 10.0,
        "CLI-005": 0.0, "CLI-006": 10.0, "CLI-007": 0.0, "CLI-008": 0.0, "CLI-009": 0.0,
    }  # copiado de bd_clientes.descuento_fijo — solo lectura, nunca se escribe ahí

    ahora_cdmx = datetime.now(TZ_CDMX)

    conn = _conectar_db()
    max_id_actual = obtener_max_id_pedido(conn)

    pedidos, anomalias = generar_lote(
        fecha_inicio, fecha_fin, args.seed, max_id_actual, mix, clientes_descuento, ahora_cdmx
    )
    reporte = construir_reporte_dry_run(pedidos)

    print(f"Rango: {fecha_inicio} .. {fecha_fin}")
    print(f"Total pedidos generados: {reporte['total_pedidos']} ({reporte['promedio_por_dia']}/día)")
    print(f"Futuras (debe ser 0): {reporte['futuras']}")
    print(f"Fuera de horario 06-20 CDMX (debe ser 0): {reporte['fuera_de_horario']}")
    print(f"Por canal: {reporte['por_canal']}")
    print(f"Por estado: {reporte['por_estado']}")
    print(f"Histograma hora CDMX: {reporte['histograma_hora_cdmx']}")
    print(f"Eventos/incidentes activos en el rango: {len(anomalias)} ({sorted(set(a['evento_id'] for a in anomalias))})")

    if not args.apply:
        print("\nDRY-RUN — no se escribió nada. Corre con --apply para insertar.")
        return

    insertar_lote(conn, pedidos)
    insertar_anomalias(conn, anomalias)
    print(f"\nAplicado: {len(pedidos)} pedidos insertados (es_sintetico=true), {sum(len(p.lineas) for p in pedidos)} líneas de detalle, {len(anomalias)} filas en bd_anomalias_verdad.")


if __name__ == "__main__":
    main()

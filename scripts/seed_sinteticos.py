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


def numero_pedidos_dia(fecha: date, seed_global: int, objetivo_base: float) -> int:
    """Volumen del día: objetivo base (Fase 1, economia.py) * factor_dow * factor_mensual,
    con ruido Poisson (no determinista en el conteo exacto, sí en todo lo demás)."""
    lam = objetivo_base * factor_dow(fecha) * factor_mensual(fecha)
    rng = _seed_rng(seed_global, fecha.isoformat(), "n_pedidos")
    return max(1, int(rng.poisson(lam)))


def elegir_canal(rng: np.random.Generator, mix_canal: dict) -> str:
    canales = list(mix_canal.keys())
    pesos = np.array([mix_canal[c]["pct"] for c in canales])
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
) -> PedidoGenerado:
    # Salt distinto a perfil._seed_pedido("{seed}:{id_pedido}") a propósito: si este rng
    # y el que usa internamente muestrear_hora_minuto_segundo compartieran semilla, sus
    # primeros sorteos (canal aquí, hora allá) quedarían correlacionados por el mismo
    # cuantil uniforme subyacente — un bug real que se detectó en el dry-run de Fase 5
    # (canal y hora salían perfectamente separados, 100%/0%, para un mismo día).
    rng = _seed_rng(seed_global, id_pedido, "canal_basket")

    canal = elegir_canal(rng, mix["mix_canal"])
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
) -> list[PedidoGenerado]:
    """Genera pedidos para [fecha_inicio, fecha_fin] inclusive. Si ahora_cdmx se da y
    fecha_fin == ahora_cdmx.date(), solo genera horas ya transcurridas (Regla 5)."""
    objetivo_base = mix["objetivo_pedidos_dia"]
    pedidos: list[PedidoGenerado] = []
    offset = 1
    dia = fecha_inicio
    while dia <= fecha_fin:
        n = numero_pedidos_dia(dia, seed_global, objetivo_base)
        for _ in range(n):
            id_pedido = siguiente_id_pedido_local(max_id_actual, offset)
            offset += 1
            p = generar_pedido(id_pedido, dia, seed_global, mix, clientes_descuento)
            if ahora_cdmx and dia == ahora_cdmx.date() and p.fecha_hora.astimezone(TZ_CDMX) > ahora_cdmx:
                continue  # Regla 5: nunca futuro
            pedidos.append(p)
        dia += timedelta(days=1)
    return pedidos


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

    pedidos = generar_lote(
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

    if not args.apply:
        print("\nDRY-RUN — no se escribió nada. Corre con --apply para insertar.")
        return

    insertar_lote(conn, pedidos)
    print(f"\nAplicado: {len(pedidos)} pedidos insertados (es_sintetico=true), {sum(len(p.lineas) for p in pedidos)} líneas de detalle.")


if __name__ == "__main__":
    main()

"""Perfil operativo de Café Plus — ÚNICA fuente de verdad de horario/afinidades.

Usado por scripts/retime_pedidos.py (Fase 2.3) y scripts/seed_sinteticos.py (Fase 4).
Todo valor sin respaldo en bd_ventas/bd_detalle_pedidos está marcado SUPUESTO.

Ventanas de acentuación de Fase 3 (verificadas contra los pesos dados):
  lun-vie 06:00-08:59 (horas 6,7,8)   -> pesos_hora_base da 0.43, banda [0.40,0.46] OK
  sáb-dom 09:00-12:59 (horas 9,10,11,12) -> pesos_hora_base da 0.52, banda [0.48,0.56] OK
Los pesos base ya caen en banda sin ajuste. La calibración de abajo es sobre las
AFINIDADES (sándwich/delivery/local), para que al mezclarlas con su share real de
pedidos la banda siga cumpliéndose — no se tocan los pesos base.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date

import numpy as np

HORAS = list(range(6, 21))  # 06:00..20:59, 15 valores
N_HORAS = len(HORAS)
HORA_IDX = {h: i for i, h in enumerate(HORAS)}

# SUPUESTO (dado por el ejercicio) — pesos por hora, ya normalizados (suman 1.00).
PESOS_HORA_RAW = {
    "entre_semana": [0.12, 0.16, 0.15, 0.09, 0.06, 0.05, 0.06, 0.07, 0.06, 0.04, 0.03, 0.03, 0.03, 0.03, 0.02],
    "fin_semana":   [0.02, 0.04, 0.07, 0.12, 0.14, 0.14, 0.12, 0.08, 0.06, 0.05, 0.04, 0.04, 0.04, 0.03, 0.01],
}

# SUPUESTO — factor_dow, lunes=0..domingo=6 (date.weekday()).
FACTOR_DOW_RAW = {0: 0.92, 1: 1.02, 2: 0.95, 3: 0.97, 4: 1.05, 5: 1.12, 6: 1.17}

# SUPUESTO — índice mensual, 1=enero..12=diciembre.
INDICE_MENSUAL_RAW = {
    1: 0.88, 2: 0.95, 3: 1.00, 4: 1.00, 5: 1.02, 6: 0.95,
    7: 0.93, 8: 0.90, 9: 0.98, 10: 1.05, 11: 1.10, 12: 1.22,
}
FACTOR_QUINCENA = 1.05  # SUPUESTO, días 14-16 y 29-31

# SUPUESTO — afinidades multiplicativas iniciales (antes de calibrar).
AFINIDAD_SANDWICH = {h: 1.0 for h in HORAS}
for h in (12, 13, 14):
    AFINIDAD_SANDWICH[h] = 1.8
for h in (6, 7, 8):
    AFINIDAD_SANDWICH[h] = 0.6

AFINIDAD_DELIVERY = {h: 1.0 for h in HORAS}
for h in (13, 14, 18, 19, 20):
    AFINIDAD_DELIVERY[h] = 1.5
for h in (6, 7, 8):
    AFINIDAD_DELIVERY[h] = 0.7

AFINIDAD_LOCAL = {h: 1.0 for h in HORAS}
for h in (6, 7, 8):
    AFINIDAD_LOCAL[h] = 1.2

# Medido en Fase 0 (analytics/config.yaml) — shares usados solo para la calibración
# de afinidades (verificar que la marginal agregada no se salga de la banda), no son
# un SUPUESTO nuevo.
SHARE_DELIVERY = 0.447
SHARE_LOCAL = 1 - SHARE_DELIVERY
SHARE_SANDWICH = 0.18  # SUPUESTO — no medido en Fase 0 (no se agregó por categoría de producto); valor editorial razonable para 1 de 4 categorías de producto con 2 líneas/pedido promedio.

VENTANA_LUNVIE = [HORA_IDX[h] for h in (6, 7, 8)]
VENTANA_SABDOM = [HORA_IDX[h] for h in (9, 10, 11, 12)]
BANDA_LUNVIE = (0.40, 0.46)
BANDA_SABDOM = (0.48, 0.56)

TURNOS = {
    "matutino": {"cajero": "USR-002", "inicio": 6, "fin": 14},
    "vespertino": {"cajero": "USR-003", "inicio": 13, "fin": 21},
}


def _normalizar_media_1(d: dict) -> dict:
    media = sum(d.values()) / len(d)
    return {k: v / media for k, v in d.items()}


FACTOR_DOW = _normalizar_media_1(FACTOR_DOW_RAW)
INDICE_MENSUAL = _normalizar_media_1(INDICE_MENSUAL_RAW)


def _normalizar_suma_1(pesos: list[float]) -> np.ndarray:
    arr = np.array(pesos, dtype=float)
    return arr / arr.sum()


PESOS_HORA = {k: _normalizar_suma_1(v) for k, v in PESOS_HORA_RAW.items()}


def tipo_dia(fecha: date) -> str:
    return "fin_semana" if fecha.weekday() >= 5 else "entre_semana"


def factor_dow(fecha: date) -> float:
    return FACTOR_DOW[fecha.weekday()]


def factor_mensual(fecha: date) -> float:
    base = INDICE_MENSUAL[fecha.month]
    if fecha.day in range(14, 17) or fecha.day in range(29, 32):
        return base * FACTOR_QUINCENA
    return base


def _concentracion(pesos: np.ndarray, ventana: list[int]) -> float:
    return float(pesos[ventana].sum())


def _marginal_mezclada(pesos_base: np.ndarray, afin_sandwich_factor: float, afin_delivery_factor: float) -> np.ndarray:
    sandwich_vec = np.array([AFINIDAD_SANDWICH[h] for h in HORAS])
    sandwich_vec = 1.0 + (sandwich_vec - 1.0) * afin_sandwich_factor
    delivery_vec = np.array([AFINIDAD_DELIVERY[h] for h in HORAS])
    delivery_vec = 1.0 + (delivery_vec - 1.0) * afin_delivery_factor

    dist_sandwich = _normalizar_suma_1(pesos_base * sandwich_vec)
    dist_no_sandwich = pesos_base  # ya normalizado
    dist_producto = SHARE_SANDWICH * dist_sandwich + (1 - SHARE_SANDWICH) * dist_no_sandwich

    dist_delivery = _normalizar_suma_1(dist_producto * delivery_vec)
    dist_local = dist_producto  # afinidad local solo reescala 6-9, deja igual aquí; se añade abajo
    local_vec = np.array([AFINIDAD_LOCAL[h] for h in HORAS])
    dist_local = _normalizar_suma_1(dist_producto * local_vec)

    return SHARE_DELIVERY * dist_delivery + SHARE_LOCAL * dist_local


def calibrar_afinidades(max_iter: int = 20) -> dict:
    """Ajuste proporcional iterativo: amortigua sandwich/delivery hasta que la
    marginal agregada (entre semana y fin de semana) caiga dentro de las bandas
    de Fase 3. Devuelve los factores de amortiguación encontrados + diagnóstico."""
    factor_sandwich, factor_delivery = 1.0, 1.0
    historial = []
    for i in range(max_iter):
        marg_semana = _marginal_mezclada(PESOS_HORA["entre_semana"], factor_sandwich, factor_delivery)
        marg_finde = _marginal_mezclada(PESOS_HORA["fin_semana"], factor_sandwich, factor_delivery)
        c_semana = _concentracion(marg_semana, VENTANA_LUNVIE)
        c_finde = _concentracion(marg_finde, VENTANA_SABDOM)
        historial.append({"iter": i, "c_lunvie": round(c_semana, 4), "c_sabdom": round(c_finde, 4)})

        ok_semana = BANDA_LUNVIE[0] <= c_semana <= BANDA_LUNVIE[1]
        ok_finde = BANDA_SABDOM[0] <= c_finde <= BANDA_SABDOM[1]
        if ok_semana and ok_finde:
            break

        if not ok_semana:
            objetivo = sum(BANDA_LUNVIE) / 2
            factor_sandwich *= 0.85 if c_semana < objetivo else 1.0
            factor_delivery *= 0.85 if c_semana < objetivo else 1.0
        if not ok_finde:
            objetivo = sum(BANDA_SABDOM) / 2
            factor_sandwich *= 0.85 if c_finde < objetivo else 1.0
            factor_delivery *= 0.85 if c_finde < objetivo else 1.0

    return {
        "factor_sandwich": round(factor_sandwich, 4),
        "factor_delivery": round(factor_delivery, 4),
        "convergio": ok_semana and ok_finde,
        "concentracion_final": {"lun_vie_06_09": round(c_semana, 4), "sab_dom_09_13": round(c_finde, 4)},
        "historial": historial,
    }


_CALIBRACION = calibrar_afinidades()


def afinidad_producto(hora: int, tiene_sandwich: bool) -> float:
    if not tiene_sandwich:
        return 1.0
    base = AFINIDAD_SANDWICH[hora]
    return 1.0 + (base - 1.0) * _CALIBRACION["factor_sandwich"]


def afinidad_canal(hora: int, canal: str) -> float:
    if canal == "local":
        return AFINIDAD_LOCAL[hora]
    base = AFINIDAD_DELIVERY[hora]
    return 1.0 + (base - 1.0) * _CALIBRACION["factor_delivery"]


def _seed_dia(fecha: date, seed_global: int) -> int:
    clave = f"{seed_global}:{fecha.isoformat()}"
    return int(hashlib.sha256(clave.encode()).hexdigest()[:8], 16)


def pesos_dia_dirichlet(fecha: date, seed_global: int, concentracion: float = 40.0) -> np.ndarray:
    base = PESOS_HORA[tipo_dia(fecha)]
    rng = np.random.default_rng(_seed_dia(fecha, seed_global))
    return rng.dirichlet(base * concentracion)


def pesos_pedido(
    fecha: date,
    seed_global: int,
    tiene_sandwich: bool = False,
    canal: str = "local",
) -> np.ndarray:
    pesos = pesos_dia_dirichlet(fecha, seed_global)
    afin = np.array(
        [afinidad_producto(h, tiene_sandwich) * afinidad_canal(h, canal) for h in HORAS]
    )
    return _normalizar_suma_1(pesos * afin)


def cajero_en_turno(hora: int, seed_id: int) -> str:
    en_matutino = TURNOS["matutino"]["inicio"] <= hora < TURNOS["matutino"]["fin"]
    en_vespertino = TURNOS["vespertino"]["inicio"] <= hora < TURNOS["vespertino"]["fin"]
    if en_matutino and en_vespertino:
        rng = np.random.default_rng(seed_id)
        return rng.choice([TURNOS["matutino"]["cajero"], TURNOS["vespertino"]["cajero"]])
    if en_matutino:
        return TURNOS["matutino"]["cajero"]
    if en_vespertino:
        return TURNOS["vespertino"]["cajero"]
    return TURNOS["matutino"]["cajero"]


def _seed_pedido(seed_global: int, id_pedido: str) -> int:
    clave = f"{seed_global}:{id_pedido}"
    return int(hashlib.sha256(clave.encode()).hexdigest()[:8], 16)


def muestrear_hora_minuto_segundo(
    fecha: date,
    id_pedido: str,
    seed_global: int,
    tiene_sandwich: bool = False,
    canal: str = "local",
) -> tuple[int, int, int]:
    pesos = pesos_pedido(fecha, seed_global, tiene_sandwich, canal)
    rng = np.random.default_rng(_seed_pedido(seed_global, id_pedido))
    hora = int(rng.choice(HORAS, p=pesos))
    minuto = int(rng.integers(0, 60))
    segundo = int(rng.integers(0, 60))
    return hora, minuto, segundo


if __name__ == "__main__":
    import json

    print("Calibración de afinidades:")
    print(json.dumps(_CALIBRACION, indent=2))
    print("\nFactor DOW normalizado:", {k: round(v, 4) for k, v in FACTOR_DOW.items()})
    print("Índice mensual normalizado:", {k: round(v, 4) for k, v in INDICE_MENSUAL.items()})

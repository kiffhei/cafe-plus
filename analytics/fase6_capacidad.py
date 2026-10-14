"""Fase 6.5 — Simulación de capacidad vs demanda (SimPy).

2 cajeros (turno matutino 06-14, vespertino 13-21, solape 13-14h con 2 activos),
tiempo de servicio lognormal (media 3.5 min, Fase 1 config.yaml), llegada de pedidos vía
proceso de Poisson no-homogéneo con la forma horaria medida en Fase 0/perfil.py, SLA:
espera <= 5 min (config.yaml sla_espera_umbral_min).

Se corre para el día de mayor carga esperada (objetivo_pedidos_dia escalado por el
factor_dow más alto, es decir sábado) para encontrar el punto de quiebre de capacidad.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import simpy
import yaml

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from perfil import HORAS, PESOS_HORA, FACTOR_DOW, TURNOS

CONFIG = yaml.safe_load((Path(__file__).parent / "config.yaml").read_text())
TIEMPO_SERVICIO_MEDIO_MIN = CONFIG["operacion"]["tiempo_servicio_medio_min"]
SLA_MIN = CONFIG["operacion"]["sla_espera_umbral_min"]


def cajeros_activos_a_hora(hora: int) -> int:
    en_mat = TURNOS["matutino"]["inicio"] <= hora < TURNOS["matutino"]["fin"]
    en_vesp = TURNOS["vespertino"]["inicio"] <= hora < TURNOS["vespertino"]["fin"]
    return int(en_mat) + int(en_vesp)


def simular_dia(pedidos_dia: int, tipo_dia: str, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    pesos = PESOS_HORA[tipo_dia]
    n_por_hora = rng.multinomial(pedidos_dia, pesos)

    env = simpy.Environment()
    # Un Resource por cajero activo en cada minuto sería complejo; se modela con 2
    # Resources fijos (matutino, vespertino) y se asigna cada pedido al/los cajeros
    # activos en su minuto exacto de llegada — si ambos están activos (13-14h), se usa
    # un pool de capacidad 2 para esa franja.
    cajero_mat = simpy.Resource(env, capacity=1)
    cajero_vesp = simpy.Resource(env, capacity=1)

    esperas = []
    excede_sla = []

    def recurso_para_minuto(minuto_total: int):
        hora = minuto_total // 60
        en_mat = TURNOS["matutino"]["inicio"] * 60 <= minuto_total < TURNOS["matutino"]["fin"] * 60
        en_vesp = TURNOS["vespertino"]["inicio"] * 60 <= minuto_total < TURNOS["vespertino"]["fin"] * 60
        if en_mat and en_vesp:
            return None  # ambos activos: se decide por disponibilidad real abajo
        if en_mat:
            return cajero_mat
        if en_vesp:
            return cajero_vesp
        return cajero_mat  # fuera de horario no debería pasar (Regla 5), fallback

    def atender(env, llegada_min, idx_hora):
        t_servicio = float(rng.lognormal(mean=np.log(TIEMPO_SERVICIO_MEDIO_MIN), sigma=0.4))
        recurso = recurso_para_minuto(int(llegada_min))
        if recurso is None:
            # 13-14h: ambos cajeros activos -> el que esté libre primero
            with cajero_mat.request() as r1, cajero_vesp.request() as r2:
                yield r1 | r2
                t_inicio = env.now
                espera = t_inicio - llegada_min
                esperas.append(espera)
                excede_sla.append(espera > SLA_MIN)
                yield env.timeout(t_servicio)
        else:
            with recurso.request() as req:
                yield req
                t_inicio = env.now
                espera = t_inicio - llegada_min
                esperas.append(espera)
                excede_sla.append(espera > SLA_MIN)
                yield env.timeout(t_servicio)

    def generador(env):
        for i, hora in enumerate(HORAS):
            n = int(n_por_hora[i])
            llegadas_en_hora = sorted(rng.uniform(0, 60, size=n))
            for m in llegadas_en_hora:
                llegada_min = hora * 60 + m
                yield env.timeout(max(0, llegada_min - env.now))
                env.process(atender(env, llegada_min, i))

    env.process(generador(env))
    env.run(until=21 * 60 + 60)

    esperas = np.array(esperas)
    return {
        "pedidos_simulados": len(esperas),
        "espera_media_min": round(float(np.mean(esperas)), 2) if len(esperas) else 0.0,
        "espera_p90_min": round(float(np.percentile(esperas, 90)), 2) if len(esperas) else 0.0,
        "espera_max_min": round(float(np.max(esperas)), 2) if len(esperas) else 0.0,
        "pct_excede_sla": round(100 * np.mean(excede_sla), 1) if len(excede_sla) else 0.0,
    }


def encontrar_punto_quiebre(tipo_dia: str, seed: int = 42) -> dict:
    """Sube el volumen del día hasta que >10% de pedidos excedan el SLA de 5 min."""
    resultados = []
    for volumen in range(20, 121, 10):
        r = simular_dia(volumen, tipo_dia, seed)
        r["volumen_pedidos_dia"] = volumen
        resultados.append(r)
        if r["pct_excede_sla"] > 10.0:
            break
    return resultados


def main() -> None:
    objetivo = 47.8
    factor_sabado = FACTOR_DOW[5]  # sábado, mayor afluencia
    volumen_sabado_tipico = round(objetivo * factor_sabado, 1)

    resultado = {
        "parametros": {
            "tiempo_servicio_medio_min": TIEMPO_SERVICIO_MEDIO_MIN,
            "sla_espera_umbral_min": SLA_MIN,
            "volumen_objetivo_dia": objetivo,
            "factor_dow_sabado": round(float(factor_sabado), 3),
            "volumen_sabado_tipico": volumen_sabado_tipico,
        },
        "simulacion_dia_tipico_entre_semana": simular_dia(int(objetivo), "entre_semana", seed=42),
        "simulacion_dia_tipico_fin_semana": simular_dia(int(volumen_sabado_tipico), "fin_semana", seed=42),
        "curva_punto_quiebre_entre_semana": encontrar_punto_quiebre("entre_semana"),
        "curva_punto_quiebre_fin_semana": encontrar_punto_quiebre("fin_semana"),
    }

    out = Path(__file__).parent / "out" / "fase6_capacidad.json"
    out.write_text(__import__("json").dumps(resultado, indent=2, ensure_ascii=False))
    print(__import__("json").dumps(resultado, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

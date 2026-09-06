#!/usr/bin/env python3
"""Exige verificación fresca antes de un push a main.

Un push a `main` dispara el autodeploy de EasyPanel en 5-18 segundos sobre un
punto de venta con ventas reales. Un build roto tumba el checkout de un negocio
en operación, sin intervención humana en el camino.

No corre las pruebas aquí — eso tardaría demasiado dentro de un hook. Exige el
marcador que deja `scripts/verificar.sh`, y solo lo acepta si corresponde al
commit que se está por subir.

Hook PreToolUse sobre Bash. Salida 2 = bloquear.
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

MARCADOR = Path(__file__).resolve().parent.parent / "estado-verificacion.json"
RAMAS_PROTEGIDAS = ("main", "master")
VIGENCIA_MINUTOS = 60

COMO_ARREGLARLO = (
    "Corre la verificación completa y vuelve a intentar:\n"
    "  bash scripts/verificar.sh\n"
    "Ese script corre build + lint + test y solo escribe el marcador si los tres pasan."
)


def es_push(comando: str) -> bool:
    return "git push" in comando


def apunta_a_rama_protegida(comando: str) -> bool:
    """True si el push llega a main/master, sea explícito o por rama actual."""
    if any(rama in comando for rama in RAMAS_PROTEGIDAS):
        return True
    try:
        actual = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True, timeout=5, check=False,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return True  # si no se puede saber, se asume lo peor
    return actual in RAMAS_PROTEGIDAS


def commit_actual() -> str | None:
    try:
        salida = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=5, check=False,
        )
        return salida.stdout.strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


def bloquear(motivo: str) -> int:
    sys.stderr.write(
        f"BLOQUEADO: push a main sin verificación fresca.\n"
        f"  {motivo}\n\n"
        f"main despliega solo a EasyPanel en 5-18s sobre el POS con ventas reales.\n"
        f"{COMO_ARREGLARLO}\n"
    )
    return 2


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    if entrada.get("tool_name") != "Bash":
        return 0

    comando = entrada.get("tool_input", {}).get("command", "")
    if not es_push(comando) or not apunta_a_rama_protegida(comando):
        return 0

    if not MARCADOR.is_file():
        return bloquear("no existe marcador de verificación.")

    try:
        estado = json.loads(MARCADOR.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return bloquear("el marcador de verificación está ilegible.")

    if not estado.get("todo_verde"):
        return bloquear("la última verificación NO quedó en verde.")

    esperado = commit_actual()
    if esperado and estado.get("commit") != esperado:
        return bloquear(
            f"el marcador es de otro commit ({str(estado.get('commit'))[:8]}), "
            f"no del que vas a subir ({esperado[:8]})."
        )

    try:
        sello = datetime.fromisoformat(estado["verificado_en"])
        edad = (datetime.now(timezone.utc) - sello).total_seconds() / 60
    except (KeyError, ValueError, TypeError):
        return bloquear("el marcador no tiene fecha válida.")

    if edad > VIGENCIA_MINUTOS:
        return bloquear(f"la verificación tiene {int(edad)} minutos (máximo {VIGENCIA_MINUTOS}).")

    return 0


if __name__ == "__main__":
    sys.exit(main())

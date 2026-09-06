#!/usr/bin/env python3
"""Impide que un archivo .env llegue al índice de git.

`.env` contiene VITE_GAS_API_KEY y CLERK_SECRET_KEY. La fuga de la apiKey ya
está registrada como hallazgo abierto (INC-S6-C) y la única barrera hasta hoy
era un párrafo en la documentación.

Hook PreToolUse sobre Bash. Salida 2 = bloquear.
"""

import json
import re
import sys

# `git add` / `git stage` seguido de algo que contenga .env, incluido `git add -A .env`.
PATRON_ADD_ENV = re.compile(r"git\s+(?:add|stage)\b[^\n&|;]*\.env")

# `git add .` y `git add -A` no nombran .env, pero lo arrastran si no está ignorado.
PATRON_ADD_TODO = re.compile(r"git\s+(?:add|stage)\s+(?:-A\b|--all\b|\.(?:\s|$))")


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    if entrada.get("tool_name") != "Bash":
        return 0

    comando = entrada.get("tool_input", {}).get("command", "")

    if PATRON_ADD_ENV.search(comando):
        sys.stderr.write(
            "BLOQUEADO: estás agregando un archivo .env al índice de git.\n"
            "Contiene VITE_GAS_API_KEY y CLERK_SECRET_KEY. El repo es público y el\n"
            "historial de git es permanente: una vez dentro, no sale.\n"
            "Si necesitas versionar la forma del archivo, usa .env.example con "
            "valores de relleno.\n"
        )
        return 2

    if PATRON_ADD_TODO.search(comando):
        sys.stderr.write(
            "ADVERTENCIA CONVERTIDA EN BLOQUEO: `git add .` / `git add -A` agrega todo\n"
            "lo que no esté ignorado, incluidos archivos .env nuevos que aún no estén\n"
            "en .gitignore.\n"
            "Nombra los archivos explícitamente: `git add archivo1 archivo2`.\n"
            "Revisa antes con `git status --porcelain`.\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())

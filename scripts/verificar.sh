#!/usr/bin/env bash
# Corre la verificación completa y deja el marcador que el hook de push exige.
#
# El marcador se escribe SOLO si build, lint y test pasan los tres. Si algo
# falla, el marcador anterior se borra: es preferible bloquear un push bueno
# que dejar pasar uno roto sobre un POS con ventas reales.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
MARCADOR=".claude/estado-verificacion.json"

fallar() {
  echo ""
  echo "❌ $1 falló. No se escribió el marcador — el push a main seguirá bloqueado."
  rm -f "$MARCADOR"
  exit 1
}

echo "→ build";     npm run build   --silent || fallar "build"
echo "→ lint";      npm run lint    --silent || fallar "lint"
echo "→ test";      npm run test:run --silent || fallar "test"

mkdir -p .claude
COMMIT="$(git rev-parse HEAD 2>/dev/null || echo desconocido)"
FECHA="$(python3 -c 'from datetime import datetime,timezone;print(datetime.now(timezone.utc).isoformat())')"

cat > "$MARCADOR" <<JSON
{
  "todo_verde": true,
  "commit": "$COMMIT",
  "verificado_en": "$FECHA",
  "checks": ["build", "lint", "test:run"]
}
JSON

echo ""
echo "✅ build + lint + test en verde. Marcador escrito para el commit ${COMMIT:0:8}."
echo "   Vigencia: 60 minutos. Si commiteas de nuevo, vuelve a correr esto."

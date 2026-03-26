#!/bin/sh
set -eu

echo "HF startup: checking standalone server location..."
export PORT="${PORT:-7860}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

if [ -f /app/apps/web/server.js ]; then
  echo "HF startup: using /app/apps/web/server.js"
  exec node /app/apps/web/server.js
fi

if [ -f /app/server.js ]; then
  echo "HF startup: using /app/server.js"
  exec node /app/server.js
fi

echo "HF startup: server.js not found. Dumping likely app files for debugging."
find /app -maxdepth 4 \( -name server.js -o -path "*/.next/*" \) | sort
exit 1

#!/usr/bin/env bash
# Reparte las 120 armas entre N workers paralelos (CDP por puerto propio).
# Uso: bash tools/weapons/run_batch.sh
set -e
cd "$(dirname "$0")/../.."

SLUGS_FILE="/tmp/ww_weapon_links.json"
TOTAL=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).slugs.length)' "$SLUGS_FILE")
WORKERS=4
CHUNK=$(( (TOTAL + WORKERS - 1) / WORKERS ))

PID_LIST=()
for ((i=0; i<WORKERS; i++)); do
  START=$(( i * CHUNK ))
  END=$(( START + CHUNK ))
  PORT=$(( 9551 + i ))
  OUT="/tmp/ww-weapons-part-${i}.json"
  WEPORT=$PORT WE_OUT=$OUT node tools/weapons/extract_weapons.cjs all "$START" "$END" > "/tmp/ww-worker-${i}.log" 2>&1 &
  PID_LIST+=($!)
  echo "Worker $i: slots [${START}..${END}) puerto ${PORT} pid ${!} -> ${OUT}"
done

echo "Esperando ${#PID_LIST[@]} workers..."
for pid in "${PID_LIST[@]}"; do
  wait "$pid"
done

echo "=== Combinando resultados ==="
node -e '
const fs = require("fs");
const out = {};
for (let i = 0; i < 4; i++) {
  const f = `/tmp/ww-weapons-part-${i}.json`;
  if (fs.existsSync(f)) { Object.assign(out, JSON.parse(fs.readFileSync(f, "utf8"))); }
}
fs.writeFileSync("/tmp/ww-weapons-data.json", JSON.stringify(out, null, 1));
console.log("Total armas:", Object.keys(out).length);
'
echo "DONE. Archivo combinado: /tmp/ww-weapons-data.json"

#!/bin/sh
# Drive legs in turn, each from the snapshot the previous one saved; stop at the first that fails.
#   START=<snapshot> LEGFILE=legs/from-start.json LEGS="0 1 2" sh run_legs.sh
D=$(cd "$(dirname "$0")" && pwd); OUT="$D/../work/solver"; mkdir -p "$OUT"
prev=${START:?set START to a snapshot name}; file=${LEGFILE:-$D/legs/from-start.json}
for i in ${LEGS:-0 1 2 3 4 5 6 7}; do
  name=f2-run-$i-$(date +%s)
  hops=$(python3 -c "import json;print(json.dumps(json.load(open('$file'))[$i][1]))")
  echo "=== leg $i ($(python3 -c "import json;print(json.load(open('$file'))[$i][0])"))"
  python3 "$D/drive.py" "$prev" "$hops" "$name" > "$OUT/leg$i.log" 2>&1; rc=$?
  grep -v kicked "$OUT/leg$i.log" | grep -v "^  somersault"
  [ $rc = 0 ] || { echo "STOPPED (snapshot $name)"; break; }
  prev=$name
done

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/screenshots"

mkdir -p "$OUT_DIR"

echo "Screenshot output: $OUT_DIR"
echo "Each step opens macOS screenshot tool. Select a region or window."
echo "Press Esc to skip a shot."
echo

declare -a SHOTS=(
  "home_overview"
  "import_wizard"
  "de_panel"
  "volcano_plot"
  "enrichment_panel_table"
  "enrichment_panel_upset"
  "pathway_mapping"
  "evidence_audit"
  "export_dialog"
)

for name in "${SHOTS[@]}"; do
  echo "Next: $name"
  echo "1) Bring BioViz to the desired state."
  echo "2) Press Enter to start capture (Esc to skip)."
  read -r _
  echo "Capturing: $name"
  /usr/sbin/screencapture -i -x "$OUT_DIR/${name}.png" || true
  if [[ -f "$OUT_DIR/${name}.png" ]]; then
    echo "Saved: $OUT_DIR/${name}.png"
  else
    echo "Skipped: $name"
  fi
  echo
  sleep 0.5
  
done

echo "Done. Review images in $OUT_DIR."

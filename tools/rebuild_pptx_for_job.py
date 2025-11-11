# tools/rebuild_pptx_for_job.py
import sys
from pathlib import Path

# Ensure project root is on sys.path so imports like 'utils' work
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json
from utils.pptx_builder import build_pptx

JOB_ID = "2920268216d6"   # replace if different
JOB_DIR = Path("output") / JOB_ID
pitch_json = JOB_DIR / "pitch.json"
out_pptx = JOB_DIR / "pitch_fixed.pptx"

if not pitch_json.exists():
    print("pitch.json not found at", pitch_json)
    raise SystemExit(1)

data = json.load(open(pitch_json, encoding="utf-8"))
build_pptx(data, out_pptx)
print("Wrote safe PPTX to:", out_pptx)

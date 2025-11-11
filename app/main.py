# app/main.py
# FastAPI application skeleton with endpoints and background enqueue fallback to BackgroundTasks.
import os
import uuid
import json
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional

# Try to import RQ (optional). If not present or REDIS_URL not set, we'll use BackgroundTasks.
try:
    import redis
    from rq import Queue
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis_conn = redis.from_url(REDIS_URL)
    rq_queue = Queue("pitchpro", connection=redis_conn)
    RQ_AVAILABLE = True
except Exception:
    RQ_AVAILABLE = False
    rq_queue = None

# Worker function (imported lazily to avoid heavy imports at server start)
from worker.process_job import process_job_simple  # synchronous callable we can call in BG

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="PitchPro Workbench - MVP")

from fastapi.staticfiles import StaticFiles
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "output"
# mount the directory so /static/output/<job_id>/file is available
app.mount("/static/output", StaticFiles(directory=str(OUTPUT_DIR)), name="static_output")


class PitchRequest(BaseModel):
    idea: str
    audience: Optional[str] = "investors"
    tone: Optional[str] = "professional"
    use_mock_llm: Optional[bool] = True

def _write_status(job_id: str, status: str, extra: dict = None):
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    status_obj = {"job_id": job_id, "status": status}
    if extra:
        status_obj.update(extra)
    with open(job_dir / "status.json", "w", encoding="utf-8") as f:
        json.dump(status_obj, f, indent=2)

@app.post("/api/v1/pitches", status_code=202)
def create_pitch(req: PitchRequest, background_tasks: BackgroundTasks):
    job_id = uuid.uuid4().hex[:12]
    _write_status(job_id, "queued", {"idea": req.idea})
    # Enqueue in RQ if available, otherwise use FastAPI BackgroundTasks
    if RQ_AVAILABLE:
        # RQ enqueues a job; worker/process_job.py must define a top-level function `rq_process_job`
        try:
            rq_queue.enqueue("worker.process_job.rq_process_job", job_id, req.dict())
            return {"job_id": job_id, "status": "queued"}
        except Exception as e:
            # fallback to BackgroundTasks
            background_tasks.add_task(process_job_simple, job_id, req.dict())
            return {"job_id": job_id, "status": "queued", "note": "RQ enqueue failed, using background task"}
    else:
        background_tasks.add_task(process_job_simple, job_id, req.dict())
        return {"job_id": job_id, "status": "queued", "note": "RQ not available; running in background"}

@app.get("/api/v1/pitches/{job_id}/status")
def get_status(job_id: str):
    job_dir = OUTPUT_DIR / job_id
    status_file = job_dir / "status.json"
    if not status_file.exists():
        raise HTTPException(status_code=404, detail="job_id not found")
    with open(status_file, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/v1/pitches/{job_id}/download")
def download_pptx(job_id: str):
    job_dir = OUTPUT_DIR / job_id
    pptx_path = job_dir / "pitch.pptx"
    if not pptx_path.exists():
        raise HTTPException(status_code=404, detail="PPTX not ready")
    # For MVP: return path info or stream file. We'll return a local path URL string for frontend to fetch.
    return {"download_path": f"/static/output/{job_id}/pitch.pptx", "local_path": str(pptx_path)}

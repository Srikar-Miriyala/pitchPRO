# main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uuid
import os
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

# Import from worker
from worker.process_job import process_job

app = FastAPI(title="PitchPRO API", version="1.0.0")

import os
# Temporary fix - set environment variables in code
os.environ['GEMINI_API_KEY'] = 'AIzaSyA4QQynAfopBIXIxC4LquHiId1oPHRcGas'
os.environ['GEMINI_MODEL'] = 'gemini-2.5-flash'

# CORS middleware to allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (output directory)
BASE_OUTPUT = Path("output")
BASE_OUTPUT.mkdir(exist_ok=True)  # Ensure output directory exists
app.mount("/static", StaticFiles(directory=BASE_OUTPUT), name="static")

class PitchRequest(BaseModel):
    idea: str
    audience: str = "investors"
    tone: str = "professional"
    use_mock_llm: bool = False

class PitchResponse(BaseModel):
    job_id: str
    status: str
    message: str

@app.get("/")
async def root():
    return {"message": "PitchPRO API is running"}

@app.get("/api/v1/pitches/{job_id}/status")
async def get_job_status(job_id: str):
    """Get the status of a pitch generation job."""
    status_file = BASE_OUTPUT / job_id / "status.json"
    
    if not status_file.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    try:
        import json
        with open(status_file, 'r') as f:
            status_data = json.load(f)
        
        # Check if PPTX exists and create download URL
        pptx_file = BASE_OUTPUT / job_id / "pitch.pptx"
        download_url = None
        if pptx_file.exists():
            download_url = f"/static/{job_id}/pitch.pptx"
        
        return {
            "job_id": job_id,
            "status": status_data.get("status", "unknown"),
            "download_url": download_url,
            "has_pptx": pptx_file.exists()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading status: {str(e)}")

@app.post("/api/v1/pitches", response_model=PitchResponse)
async def create_pitch(request: PitchRequest, background_tasks: BackgroundTasks):
    """Create a new pitch generation job."""
    job_id = str(uuid.uuid4())[:8]  # Short ID for easier handling
    
    # Prepare parameters for process_job
    params = {
        "idea": request.idea,
        "audience": request.audience,
        "tone": request.tone,
        "max_tokens": 4000
    }
    
    # Run the job in background
    background_tasks.add_task(process_job, job_id, params)
    
    return PitchResponse(
        job_id=job_id,
        status="queued",
        message="Pitch generation started"
    )

@app.get("/api/v1/pitches/{job_id}/download")
async def download_pitch(job_id: str):
    """Download the generated PowerPoint file."""
    pptx_file = BASE_OUTPUT / job_id / "pitch.pptx"
    
    if not pptx_file.exists():
        raise HTTPException(status_code=404, detail="PPTX file not found")
    
    return FileResponse(
        path=pptx_file,
        filename=f"pitch-{job_id}.pptx",
        media_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )

@app.get("/api/v1/pitches/{job_id}/pitch")
async def get_pitch_data(job_id: str):
    """Get the pitch JSON data directly."""
    pitch_file = BASE_OUTPUT / job_id / "pitch.json"
    
    if not pitch_file.exists():
        raise HTTPException(status_code=404, detail="Pitch data not found")
    
    try:
        import json
        with open(pitch_file, 'r', encoding='utf-8') as f:
            pitch_data = json.load(f)
        return pitch_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading pitch data: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PitchPRO API"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PitchPRO Backend on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
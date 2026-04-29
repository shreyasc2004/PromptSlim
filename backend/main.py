from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from compressor import run_compression
import os
import json

app = FastAPI(title="PromptSlim API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Simple file-based counter (works on HF Spaces) ────────────────────────────
COUNTER_FILE = "compression_count.json"

def get_count():
    try:
        if os.path.exists(COUNTER_FILE):
            with open(COUNTER_FILE, "r") as f:
                return json.load(f).get("count", 0)
    except Exception:
        pass
    return 0

def increment_count():
    count = get_count() + 1
    try:
        with open(COUNTER_FILE, "w") as f:
            json.dump({"count": count}, f)
    except Exception:
        pass
    return count

# ── Schemas ───────────────────────────────────────────────────────────────────
class CompressRequest(BaseModel):
    prompt:     str
    conclusion: Optional[str] = None
    ratio:      float         = 0.65

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/count")
def get_compression_count():
    return {"count": get_count()}

@app.post("/compress")
def compress(req: CompressRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    try:
        result = run_compression(
            prompt=req.prompt,
            conclusion=req.conclusion,
            ratio=req.ratio
        )
        # Increment counter on every successful compression
        count = increment_count()
        result["total_compressions"] = count
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve React frontend — must be AFTER API routes
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
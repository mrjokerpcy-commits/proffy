from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

from .pipeline import ProcessingPipeline
from .models import ProcessRequest, ProcessResult

load_dotenv()

app = FastAPI(title="StudyAI Processor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = ProcessingPipeline()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process/file", response_model=ProcessResult)
async def process_file(
    file: UploadFile = File(...),
    university: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    professor: Optional[str] = None,
    year: Optional[str] = None,
    doc_type: Optional[str] = None,
):
    """Process an uploaded file: extract text, chunk, embed, store in Qdrant."""
    content = await file.read()
    result = await pipeline.process(
        content=content,
        filename=file.filename or "unknown",
        metadata={
            "university": university,
            "department": department,
            "course": course,
            "professor": professor,
            "year": year,
            "type": doc_type,
        },
    )
    return result


@app.post("/process/url")
async def process_url(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Process a file from a URL (Google Drive, web) in the background."""
    background_tasks.add_task(pipeline.process_url, request.url, request.metadata)
    return {"status": "queued", "url": request.url}

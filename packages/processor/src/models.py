from pydantic import BaseModel
from typing import Optional, Dict, Any


class DocumentMetadata(BaseModel):
    university: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    professor: Optional[str] = None
    year: Optional[str] = None
    type: Optional[str] = None   # exam | lecture | summary | notes
    source: Optional[str] = None  # drive | upload | crawler


class ProcessRequest(BaseModel):
    url: str
    metadata: DocumentMetadata = DocumentMetadata()


class ChunkResult(BaseModel):
    chunk_id: str
    text: str
    metadata: Dict[str, Any]
    embedding_stored: bool


class ProcessResult(BaseModel):
    file_id: str
    filename: str
    detected_type: str
    chunks_created: int
    was_duplicate: bool
    metadata: Dict[str, Any]

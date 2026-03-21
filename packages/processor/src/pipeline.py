import hashlib
import uuid
from typing import Any, Dict, Optional

from .extractors.pdf import extract_pdf
from .extractors.pptx import extract_pptx
from .extractors.docx import extract_docx
from .extractors.image import extract_image
from .chunker import chunk_text
from .tagger import detect_type, auto_tag
from .embedder import embed_and_store
from .models import ProcessResult, DocumentMetadata


EXTRACTORS = {
    ".pdf": extract_pdf,
    ".pptx": extract_pptx,
    ".ppt": extract_pptx,
    ".docx": extract_docx,
    ".doc": extract_docx,
    ".png": extract_image,
    ".jpg": extract_image,
    ".jpeg": extract_image,
    ".webp": extract_image,
}


class ProcessingPipeline:
    def __init__(self):
        self._processed_hashes: set[str] = set()

    def _content_hash(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def _get_extractor(self, filename: str):
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return EXTRACTORS.get(ext)

    async def process(
        self,
        content: bytes,
        filename: str,
        metadata: Dict[str, Any],
    ) -> ProcessResult:
        # Deduplication
        file_hash = self._content_hash(content)
        if file_hash in self._processed_hashes:
            return ProcessResult(
                file_id=file_hash,
                filename=filename,
                detected_type="unknown",
                chunks_created=0,
                was_duplicate=True,
                metadata=metadata,
            )

        # Extract text
        extractor = self._get_extractor(filename)
        if not extractor:
            raise ValueError(f"Unsupported file type: {filename}")

        text = await extractor(content, filename)

        # AI detects document type if not provided
        detected_type = metadata.get("type") or await detect_type(text)

        # Auto-tag if fields missing
        tags = await auto_tag(text, metadata)

        # Chunk
        chunks = chunk_text(text, chunk_size=512, overlap=50)

        # Build metadata per chunk
        full_metadata = {
            **tags,
            "filename": filename,
            "file_hash": file_hash,
            "type": detected_type,
            "source": metadata.get("source", "upload"),
        }

        # Embed + store in Qdrant
        chunk_count = await embed_and_store(chunks, full_metadata)

        self._processed_hashes.add(file_hash)

        return ProcessResult(
            file_id=file_hash,
            filename=filename,
            detected_type=detected_type,
            chunks_created=chunk_count,
            was_duplicate=False,
            metadata=full_metadata,
        )

    async def process_url(self, url: str, metadata: DocumentMetadata):
        """Fetch from URL and process (used for Drive/crawler)."""
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=60)
            response.raise_for_status()

        filename = url.split("/")[-1].split("?")[0] or "document"
        await self.process(
            content=response.content,
            filename=filename,
            metadata=metadata.model_dump(),
        )

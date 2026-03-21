import io
import mammoth


async def extract_docx(content: bytes, filename: str) -> str:
    """Extract text from DOCX using mammoth."""
    result = mammoth.extract_raw_text(io.BytesIO(content))
    return result.value

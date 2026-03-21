from typing import List


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    """
    Split text into chunks of ~chunk_size tokens with overlap.
    Uses a simple word-based approximation (1 token ≈ 0.75 words).
    """
    if not text or not text.strip():
        return []

    words = text.split()
    # Approximate token count: 1 token ~ 0.75 words, so chunk_size tokens ~ chunk_size/0.75 words
    words_per_chunk = int(chunk_size / 0.75)
    overlap_words = int(overlap / 0.75)

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + words_per_chunk, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end == len(words):
            break
        start += words_per_chunk - overlap_words

    return chunks

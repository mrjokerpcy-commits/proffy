import os
import uuid
from typing import Any, Dict, List

from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "studyai_chunks"
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
qdrant = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)


async def ensure_collection():
    collections = await qdrant.get_collections()
    names = [c.name for c in collections.collections]
    if COLLECTION_NAME not in names:
        await qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )


async def embed_and_store(chunks: List[str], metadata: Dict[str, Any]) -> int:
    """Embed all chunks and store in Qdrant. Returns number of chunks stored."""
    if not chunks:
        return 0

    await ensure_collection()

    # Batch embed (max 2048 per call)
    response = await openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=chunks,
    )
    embeddings = [item.embedding for item in response.data]

    # Build Qdrant points
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "text": chunk,
                "chunk_index": i,
                **metadata,
            },
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    await qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
    return len(points)

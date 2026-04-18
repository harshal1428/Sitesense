"""
SiteSense AI — ChromaDB Service (Embedded Stability Edition)

This version uses an embedded PersistentClient to avoid Windows 
networking/firewall issues that block local HTTP connections.
"""

from __future__ import annotations
import chromadb
from config import settings

# ---------------------------------------------------------------------------
# Module-level client — lazy-initialised
# ---------------------------------------------------------------------------
_client: chromadb.PersistentClient | None = None


def get_chroma_client() -> chromadb.PersistentClient:
    """
    Return a reusable persistent client connected directly to the
    local data directory. No network overhead.
    """
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_PATH
        )
    return _client


# ===================================================================
#  HELPERS
# ===================================================================

def get_collection_name(bot_id: str) -> str:
    return f"tenant_{bot_id.replace('-', '_')}"


# ===================================================================
#  COLLECTION LIFECYCLE
# ===================================================================

async def get_or_create_collection(bot_id: str):
    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={
            "hnsw:space": "cosine",
            "tenant_bot_id": bot_id,
        },
    )
    return collection


async def collection_exists(bot_id: str) -> bool:
    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)
    try:
        client.get_collection(name=collection_name)
        return True
    except Exception:
        return False


async def get_collection_count(bot_id: str) -> int:
    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)
    try:
        collection = client.get_collection(name=collection_name)
        return collection.count()
    except Exception:
        return 0


async def delete_tenant_collection(bot_id: str) -> bool:
    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)
    try:
        client.delete_collection(name=collection_name)
        return True
    except Exception:
        return False


# ===================================================================
#  CHUNK OPERATIONS
# ===================================================================

async def add_chunks_to_collection(
    bot_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
    ids: list[str],
) -> int:
    if not chunks:
        return 0

    collection = await get_or_create_collection(bot_id)
    batch_size = 5000
    added = 0

    for start in range(0, len(chunks), batch_size):
        end = start + batch_size
        collection.add(
            documents=chunks[start:end],
            embeddings=embeddings[start:end],
            metadatas=metadatas[start:end],
            ids=ids[start:end],
        )
        added += len(chunks[start:end])

    return added


async def query_collection(
    bot_id: str,
    query_embedding: list[float],
    n_results: int = 10,
) -> dict:
    empty_result: dict = {
        "documents": [[]],
        "metadatas": [[]],
        "distances": [[]],
    }

    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)

    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        return empty_result

    count = collection.count()
    if count == 0:
        return empty_result

    n_results = min(n_results, count)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    return {
        "documents": results.get("documents", [[]]),
        "metadatas": results.get("metadatas", [[]]),
        "distances": results.get("distances", [[]]),
    }


async def delete_source_chunks(
    bot_id: str,
    source_id: str,
) -> bool:
    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)
    try:
        collection = client.get_collection(name=collection_name)
        collection.delete(
            where={"source_id": source_id},
        )
        return True
    except Exception:
        return False


async def get_all_chunks(bot_id: str) -> list[dict]:
    """Retrieve all chunks for a specific bot from ChromaDB."""
    client = get_chroma_client()
    collection_name = get_collection_name(bot_id)
    try:
        collection = client.get_collection(name=collection_name)
        results = collection.get(
            include=["documents", "metadatas"]
        )
        
        chunks = []
        docs = results.get("documents", [])
        metas = results.get("metadatas", [])
        
        for i in range(len(docs)):
            chunks.append({
                "document": docs[i],
                "metadata": metas[i] if i < len(metas) else {}
            })
        return chunks
    except Exception as e:
        logger.error(f"Error fetching all chunks for {bot_id}: {e}")
        return []

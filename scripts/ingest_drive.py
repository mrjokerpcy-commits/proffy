#!/usr/bin/env python3
"""
Bulk Drive ingestion script — run on VPS.
Uses pdfplumber for text PDFs (free), falls back to Claude Haiku only for scanned/image PDFs.

Setup:
  pip install google-api-python-client google-auth pdfplumber anthropic openai qdrant-client python-dotenv

Usage:
  python ingest_drive.py --folder DRIVE_FOLDER_ID

Progress is saved to progress.json — safe to kill and resume anytime.
"""

import os, sys, json, hashlib, argparse, time, re
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed

import pdfplumber
from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import anthropic
import openai
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
ANTHROPIC_KEY  = os.environ["ANTHROPIC_API_KEY"]
OPENAI_KEY     = os.environ["OPENAI_API_KEY"]
QDRANT_URL     = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_KEY     = os.environ.get("QDRANT_API_KEY", "")
SERVICE_ACCOUNT_FILE = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "service_account.json")
COLLECTION     = "studyai_chunks"
EMBED_MODEL    = "text-embedding-3-small"
EMBED_DIM      = 1536
PROGRESS_FILE  = "progress.json"
MAX_PDF_BYTES  = 20 * 1024 * 1024   # 20 MB
WORKERS        = 5                   # parallel file downloads

# University / course metadata — edit these
UNIVERSITY     = os.environ.get("INGEST_UNIVERSITY", "Technion")
COURSE_NAME    = os.environ.get("INGEST_COURSE", "General")
COURSE_NUMBER  = os.environ.get("INGEST_COURSE_NUMBER", "")
PROFESSOR      = os.environ.get("INGEST_PROFESSOR", "")
SEMESTER       = os.environ.get("INGEST_SEMESTER", "")

GENERIC_FOLDERS = {
    "uploads","upload","shared","files","documents","material","materials",
    "course material","general","misc","other","downloads","all courses",
    "past exams","exams","tests","quizzes","homework","hw",
    "lectures","tutorials","notes",
    "הרצאות","תרגולים","מבחנים","סיכומים","כללי","שונות",
}

ALLOWED_MIME = {
    "application/pdf": "pdf",
    "text/plain": "text",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "application/vnd.google-apps.presentation": "slides",
    "application/vnd.google-apps.document": "doc",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "office",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "office",
}

# ── Clients ───────────────────────────────────────────────────────────────────
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
openai_client    = openai.OpenAI(api_key=OPENAI_KEY)
qdrant           = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY or None)


def get_drive():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


# ── Qdrant setup ──────────────────────────────────────────────────────────────
def ensure_collection():
    existing = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION not in existing:
        qdrant.create_collection(
            COLLECTION,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
        print(f"Created collection {COLLECTION}")


# ── Progress tracking ─────────────────────────────────────────────────────────
def load_progress() -> set:
    if Path(PROGRESS_FILE).exists():
        data = json.loads(Path(PROGRESS_FILE).read_text())
        return set(data.get("done", []))
    return set()


def save_progress(done: set):
    Path(PROGRESS_FILE).write_text(json.dumps({"done": list(done)}, ensure_ascii=False))


# ── Drive file listing ────────────────────────────────────────────────────────
def list_all_files(drive, folder_id: str) -> list[dict]:
    """Recursively list all files in folder with their path."""
    results = []

    def recurse(fid: str, path: list[str]):
        page_token = None
        while True:
            resp = drive.files().list(
                q=f"'{fid}' in parents and trashed=false",
                fields="nextPageToken,files(id,name,mimeType)",
                pageSize=1000,
                pageToken=page_token,
            ).execute()
            for f in resp.get("files", []):
                if f["mimeType"] == "application/vnd.google-apps.folder":
                    recurse(f["id"], path + [f["name"]])
                elif f["mimeType"] in ALLOWED_MIME:
                    results.append({**f, "folderPath": path})
            page_token = resp.get("nextPageToken")
            if not page_token:
                break

    print("Listing Drive files...")
    recurse(folder_id, [])
    print(f"Found {len(results)} files")
    return results


# ── Course inference ──────────────────────────────────────────────────────────
_course_cache: dict[str, str] = {}

def infer_course(folder_path: list[str], filename: str, sample_text: str = "") -> str:
    meaningful = [p for p in folder_path if p.strip().lower() not in GENERIC_FOLDERS and len(p.strip()) > 1]
    if not meaningful:
        return COURSE_NAME
    if len(meaningful) == 1:
        return meaningful[0]

    key = " / ".join(meaningful)
    if key in _course_cache:
        return _course_cache[key]

    try:
        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=40,
            messages=[{"role": "user", "content": (
                f"Path: {key}\nFile: {filename}\n"
                f"Content preview: {sample_text[:300]}\n\n"
                "Identify the COURSE NAME only. Reply with the course name, nothing else."
            )}],
        )
        course = resp.content[0].text.strip()[:100]
    except Exception:
        course = meaningful[0]

    _course_cache[key] = course
    return course


def detect_doc_type(filename: str) -> str:
    n = filename.lower()
    if any(x in n for x in ["exam","מבחן","moed","midterm","final","בוחן"]): return "exam"
    if any(x in n for x in ["lecture","הרצאה","slides","שקופיות"]): return "slides"
    if any(x in n for x in ["summary","סיכום","toc"]): return "notes"
    if any(x in n for x in ["practice","תרגול","tirgul","hw","homework","תרגיל"]): return "notes"
    if any(x in n for x in ["textbook","book","ספר"]): return "textbook"
    return "notes"


# ── Text extraction ───────────────────────────────────────────────────────────
def extract_pdf_text(buf: bytes) -> tuple[str, bool]:
    """Returns (text, used_ai). Try pdfplumber first (free), fall back to Claude."""
    try:
        with pdfplumber.open(BytesIO(buf)) as pdf:
            pages = []
            for page in pdf.pages:
                t = page.extract_text() or ""
                pages.append(t)
            text = "\n\n".join(pages).strip()
            # If we got meaningful text, use it
            if len(text) > 100:
                return text, False
    except Exception:
        pass

    # Fallback: Claude Haiku (for scanned PDFs)
    try:
        b64 = __import__("base64").b64encode(buf[:4_000_000]).decode()
        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{"role": "user", "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                {"type": "text", "text": "Extract all text verbatim. Preserve structure and equations."},
            ]}],
        )
        return resp.content[0].text.strip(), True
    except Exception as e:
        return "", False


def extract_image_text(buf: bytes, mime: str) -> str:
    import base64
    b64 = base64.b64encode(buf).decode()
    try:
        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
                {"type": "text", "text": "Extract all text from this image verbatim. Include equations in LaTeX."},
            ]}],
        )
        return resp.content[0].text.strip()
    except Exception:
        return ""


# ── Chunking ──────────────────────────────────────────────────────────────────
def smart_chunk(text: str, max_words: int = 300) -> list[str]:
    chunks = []
    segments = re.split(r"\n{2,}", text)
    current, word_count = "", 0

    for seg in segments:
        words = len(seg.split())
        if word_count + words > max_words and current:
            if len(current.strip()) > 50:
                chunks.append(current.strip())
            current, word_count = seg + "\n\n", words
        else:
            current += seg + "\n\n"
            word_count += words

    if current.strip() and len(current.strip()) > 50:
        chunks.append(current.strip())

    return [c for c in chunks if len(c.split()) >= 10]


def chunk_id(file_id: str, idx: int) -> str:
    return hashlib.md5(f"{file_id}:{idx}".encode()).hexdigest()[:16]


# ── Embedding + upsert ────────────────────────────────────────────────────────
def embed_and_upsert(chunks: list[str], payload: dict, file_id: str):
    if not chunks:
        return 0
    count = 0
    for i in range(0, len(chunks), 50):
        batch = chunks[i:i+50]
        resp = openai_client.embeddings.create(model=EMBED_MODEL, input=batch)
        points = [
            PointStruct(
                id=chunk_id(file_id, i + j),
                vector=resp.data[j].embedding,
                payload={
                    **payload,
                    "text": batch[j],
                    "chunk_index": i + j,
                    "helpful_count": 0,
                    "total_shown": 0,
                    "helpfulness_score": 0.5,
                },
            )
            for j in range(len(batch))
        ]
        qdrant.upsert(COLLECTION, points=points)
        count += len(points)
    return count


# ── Process one file ──────────────────────────────────────────────────────────
def process_file(drive, file: dict) -> dict:
    fid      = file["id"]
    name     = file["name"]
    mime     = file["mimeType"]
    kind     = ALLOWED_MIME[mime]
    path     = file["folderPath"]
    full_path = " / ".join(path + [name])

    # Download
    try:
        if mime == "application/vnd.google-apps.presentation":
            req  = drive.files().export_media(fileId=fid, mimeType="application/pdf")
            mime = "application/pdf"; kind = "pdf"
        elif mime == "application/vnd.google-apps.document":
            req  = drive.files().export_media(fileId=fid, mimeType="text/plain")
            mime = "text/plain"; kind = "text"
        else:
            req = drive.files().get_media(fileId=fid)

        buf = BytesIO()
        dl  = MediaIoBaseDownload(buf, req)
        done = False
        while not done:
            _, done = dl.next_chunk()
        data = buf.getvalue()
    except Exception as e:
        return {"name": name, "chunks": 0, "error": str(e), "ai": False}

    if len(data) > MAX_PDF_BYTES:
        return {"name": name, "chunks": 0, "error": "too large", "ai": False}

    # Extract text
    used_ai = False
    text = ""
    if kind == "pdf":
        text, used_ai = extract_pdf_text(data)
    elif kind == "text":
        text = data.decode("utf-8", errors="ignore")
    elif kind == "image":
        text = extract_image_text(data, mime)
        used_ai = True
    elif kind in ("slides", "office"):
        text, used_ai = extract_pdf_text(data)  # exported as PDF above

    if not text or len(text.strip()) < 50:
        return {"name": name, "chunks": 0, "error": "no text extracted", "ai": used_ai}

    # Infer course
    course = infer_course(path, name, text[:400])
    doc_type = detect_doc_type(name)

    # Chunk + embed + upsert
    chunks = smart_chunk(text)
    safe_name = re.sub(r"[^a-zA-Z0-9._\-\u0590-\u05FF ]", "_", name)[:200]

    count = embed_and_upsert(chunks, {
        "filename":      safe_name,
        "folder_path":   full_path,
        "type":          doc_type,
        "professor":     PROFESSOR or None,
        "university":    UNIVERSITY,
        "course":        course,
        "course_number": COURSE_NUMBER or None,
        "course_id":     None,
        "user_id":       None,
        "semester":      SEMESTER or None,
        "is_shared":     True,
        "trust_level":   "verified",
    }, fid)

    return {"name": name, "chunks": count, "course": course, "ai": used_ai}


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder", required=True, help="Google Drive folder ID")
    parser.add_argument("--workers", type=int, default=WORKERS)
    args = parser.parse_args()

    ensure_collection()
    drive   = get_drive()
    files   = list_all_files(drive, args.folder)
    done    = load_progress()
    remaining = [f for f in files if f["id"] not in done]

    print(f"{len(done)} already done, {len(remaining)} remaining\n")

    total_chunks = 0
    ai_calls     = 0
    errors       = 0

    def process(f):
        return f["id"], process_file(drive, f)

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(process, f): f for f in remaining}
        for future in as_completed(futures):
            fid, result = future.result()
            done.add(fid)
            total_chunks += result.get("chunks", 0)
            if result.get("ai"):    ai_calls += 1
            if result.get("error"): errors += 1

            status = "✓" if result.get("chunks", 0) > 0 else "✗"
            ai_tag = " [AI]" if result.get("ai") else ""
            err    = f" — {result['error']}" if result.get("error") else ""
            course = f" [{result.get('course', '')}]" if result.get('course') else ""
            print(f"  {status} {result['name']} → {result.get('chunks',0)} chunks{course}{ai_tag}{err}")

            # Save progress every 10 files
            if len(done) % 10 == 0:
                save_progress(done)

    save_progress(done)
    print(f"\nDone. {total_chunks} chunks, {ai_calls} AI calls, {errors} errors.")
    print(f"Estimated AI cost: ~${ai_calls * 0.002:.2f}")


if __name__ == "__main__":
    main()

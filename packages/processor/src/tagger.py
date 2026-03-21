import os
from typing import Any, Dict, Optional
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

UNIVERSITIES = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan"]
DOC_TYPES = ["exam", "lecture", "summary", "notes", "textbook", "other"]


async def detect_type(text: str) -> str:
    """Use LLM to detect document type from first 1000 chars."""
    sample = text[:1000]
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Classify this academic document into one of: {', '.join(DOC_TYPES)}.\n"
                        f"Reply with ONLY the type word.\n\nDocument sample:\n{sample}"
                    ),
                }
            ],
            max_tokens=10,
            temperature=0,
        )
        detected = response.choices[0].message.content.strip().lower()
        return detected if detected in DOC_TYPES else "other"
    except Exception:
        return "other"


async def auto_tag(text: str, existing_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Fill in missing metadata fields using LLM if not already provided."""
    missing = [k for k in ["university", "department", "course", "professor", "year"]
               if not existing_metadata.get(k)]

    if not missing:
        return existing_metadata

    sample = text[:1500]
    try:
        fields_str = ", ".join(missing)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"From this academic document, extract: {fields_str}.\n"
                        f"Universities to check: {', '.join(UNIVERSITIES)}.\n"
                        f"Reply as JSON with only the requested fields. Use null if unknown.\n\n"
                        f"Document:\n{sample}"
                    ),
                }
            ],
            max_tokens=150,
            temperature=0,
            response_format={"type": "json_object"},
        )
        import json
        extracted = json.loads(response.choices[0].message.content)
        return {**existing_metadata, **{k: v for k, v in extracted.items() if v}}
    except Exception:
        return existing_metadata

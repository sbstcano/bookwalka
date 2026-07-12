from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Selection translation schemas (Phase 0)
class SelectionTranslationResponse(BaseModel):
    japanese: str = Field(..., description="Original Japanese text recognized by OCR")
    translation: str = Field(..., description="Translated text")

# Full-page translation schemas (For future-proofing)
class Region(BaseModel):
    id: str
    order: int
    kind: str
    japanese: str
    position: Optional[str] = None

class BookContext(BaseModel):
    title: Optional[str] = None
    glossary: List[Dict[str, Any]] = []
    character_notes: List[Dict[str, Any]] = []

class PreviousContext(BaseModel):
    rolling_summary: str = ""
    recent_lines: List[Dict[str, Any]] = []

class Page(BaseModel):
    page_id: str
    regions: List[Region]

class PageTranslationRequest(BaseModel):
    source_language: str = "ja"
    target_language: str = "en"
    book_context: Optional[BookContext] = None
    previous_context: Optional[PreviousContext] = None
    page: Page

class TranslationItem(BaseModel):
    id: str
    translation: str
    short_translation: Optional[str] = None
    uncertain: bool = False
    notes: List[str] = []

class PageTranslationResult(BaseModel):
    translations: List[TranslationItem]
    page_summary: Optional[str] = None
    glossary_updates: List[Dict[str, Any]] = []

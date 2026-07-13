from fastapi import APIRouter, Depends
from app.config import settings
from app.ocr.manga_ocr_engine import ocr_engine
from app.api.auth import verify_api_key

router = APIRouter()

@router.get("/v1/health", dependencies=[Depends(verify_api_key)])
async def health_check():
    # Check if translation provider is configured (either mock, or key exists for others)
    provider = settings.translation_provider
    configured = False
    if provider == "mock":
        configured = True
    elif provider == "openai" and settings.openai_api_key:
        configured = True
    elif provider == "gemini" and settings.gemini_api_key:
        configured = True

    return {
      "status": "ok",
      "detector_loaded": False,  # Phase 0 does not use detector
      "ocr_loaded": ocr_engine.is_loaded,
      "translation_provider_configured": configured,
      "device": settings.device,
      "version": "0.1.0"
    }

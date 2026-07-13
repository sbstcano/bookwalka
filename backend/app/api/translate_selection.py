import io
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Query, Depends
from PIL import Image
from app.ocr.manga_ocr_engine import ocr_engine
from app.translation.interface import get_translation_provider
from app.translation.schemas import SelectionTranslationResponse
from app.api.auth import verify_api_key

router = APIRouter()

@router.post(
    "/v1/translate-selection",
    response_model=SelectionTranslationResponse,
    dependencies=[Depends(verify_api_key)]
)
async def translate_selection(
    file: UploadFile = File(...),
    target_lang: str = Query("en", description="Target language code (e.g. en, fr, es)"),
    model: str | None = Query(None, description="Optional translation model override (e.g. deepseek-v4-pro)")
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided must be an image."
        )

    try:
        # Read image bytes
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse image: {e}"
        )

    try:
        # 1. OCR (extract Japanese text)
        japanese_text = ocr_engine.ocr(image)
        japanese_text = japanese_text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR execution failed: {e}"
        )

    # If OCR output is empty
    if not japanese_text:
        return SelectionTranslationResponse(
            japanese="",
            translation=""
        )

    try:
        # 2. Translate Japanese to target language
        provider = get_translation_provider()
        translation_text = await provider.translate_text(japanese_text, target_lang=target_lang, model=model)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Translation provider failed: {e}"
        )

    return SelectionTranslationResponse(
        japanese=japanese_text,
        translation=translation_text
    )

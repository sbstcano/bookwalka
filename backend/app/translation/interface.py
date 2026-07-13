from typing import Protocol
from app.config import settings
from app.translation.schemas import PageTranslationRequest, PageTranslationResult

class TranslationProvider(Protocol):
    async def translate_text(
        self,
        text: str,
        source_lang: str = "ja",
        target_lang: str = "fr",
        model: str | None = None
    ) -> str:
        """Translates a single string of text."""
        ...

    async def translate_page(
        self,
        request: PageTranslationRequest
    ) -> PageTranslationResult:
        """Translates an entire structured page (with context)."""
        ...


def get_translation_provider() -> TranslationProvider:
    provider = settings.translation_provider
    if provider == "openai":
        from app.translation.providers.openai_provider import OpenAITranslationProvider
        return OpenAITranslationProvider()
    elif provider == "gemini":
        from app.translation.providers.gemini_provider import GeminiTranslationProvider
        return GeminiTranslationProvider()
    elif provider == "deepseek":
        from app.translation.providers.deepseek_provider import DeepSeekTranslationProvider
        return DeepSeekTranslationProvider()
    
    from app.translation.providers.mock_provider import MockTranslationProvider
    return MockTranslationProvider()

from app.translation.interface import TranslationProvider
from app.translation.schemas import PageTranslationRequest, PageTranslationResult, TranslationItem

class MockTranslationProvider(TranslationProvider):
    # Standard translation mapping for testing and specs
    MOCK_DB = {
        "どうしてここにいるの？": "Why are you here?",
        "それはこっちの台詞だ": "That's my line.",
    }

    async def translate_text(
        self,
        text: str,
        source_lang: str = "ja",
        target_lang: str = "en",
        model: str | None = None
    ) -> str:
        cleaned_text = text.strip()
        if target_lang == "fr":
            french_db = {
                "どうしてここにいるの？": "Qu’est-ce que tu fais ici ?",
                "それはこっちの台詞だ": "C’est plutôt à moi de te demander ça.",
            }
            if cleaned_text in french_db:
                return french_db[cleaned_text]
            return f"[Mock FR] {cleaned_text}"
        else:
            if cleaned_text in self.MOCK_DB:
                return self.MOCK_DB[cleaned_text]
            return f"[Mock {target_lang.upper()}] {cleaned_text}"

    async def translate_page(
        self,
        request: PageTranslationRequest
    ) -> PageTranslationResult:
        translations = []
        for region in request.page.regions:
            translated_txt = await self.translate_text(
                region.japanese,
                request.source_language,
                request.target_language
            )
            translations.append(
                TranslationItem(
                    id=region.id,
                    translation=translated_txt,
                    short_translation=translated_txt[:20] + "..." if len(translated_txt) > 20 else translated_txt,
                    uncertain=False,
                    notes=[]
                )
            )
        return PageTranslationResult(
            translations=translations,
            page_summary="Mock page summary: meeting by surprise.",
            glossary_updates=[]
        )

import json
import httpx
import logging
from app.config import settings
from app.translation.interface import TranslationProvider
from app.translation.schemas import PageTranslationRequest, PageTranslationResult, TranslationItem

logger = logging.getLogger("openai_provider")

class OpenAITranslationProvider(TranslationProvider):
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.model = settings.translation_model
        if self.model == "mock-model":
            self.model = "gpt-4o-mini"

    async def translate_text(
        self,
        text: str,
        source_lang: str = "ja",
        target_lang: str = "en"
    ) -> str:
        is_official = "api.openai.com" in settings.openai_api_base
        if is_official and not self.api_key:
            raise ValueError("OpenAI API key (MANGA_OPENAI_API_KEY) is required when using official OpenAI endpoint.")

        url = f"{settings.openai_api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        lang_names = {
            "en": "English",
            "fr": "French",
            "es": "Spanish",
            "de": "German",
            "it": "Italian",
            "ja": "Japanese"
        }
        target_lang_name = lang_names.get(target_lang.lower(), target_lang)

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"You are a professional Japanese to {target_lang_name} manga translator and localizer. "
                        f"Your priority is to produce natural-sounding {target_lang_name} that is faithful to the meaning and tone. "
                        "Translate only the provided text without adding any chat, side remarks, or explanations."
                    )
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "temperature": 0.3
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if res.status_code != 200:
                raise RuntimeError(f"OpenAI API returned status {res.status_code}: {res.text}")
            
            data = res.json()
            try:
                translated = data["choices"][0]["message"]["content"].strip()
                return translated
            except (KeyError, IndexError) as e:
                raise RuntimeError(f"Failed to parse OpenAI response: {e}. Raw response: {data}")

    async def translate_page(
        self,
        request: PageTranslationRequest
    ) -> PageTranslationResult:
        is_official = "api.openai.com" in settings.openai_api_base
        if is_official and not self.api_key:
            raise ValueError("OpenAI API key (MANGA_OPENAI_API_KEY) is required when using official OpenAI endpoint.")

        url = f"{settings.openai_api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        system_instruction = (
            "You are a professional Japanese to English manga translator and localizer.\n"
            "Your priority is to produce natural English that is faithful to the meaning, tone, and context.\n"
            "You must reply only with a valid JSON object matching the requested schema."
        )

        regions_data = [
            {"id": r.id, "order": r.order, "kind": r.kind, "japanese": r.japanese}
            for r in request.page.regions
        ]

        prompt = f"""
Here are the text regions of a manga page in reading order.
Translate them to English in a structured JSON format.

Expected JSON output schema:
{{
  "translations": [
    {{
      "id": "string (the region id)",
      "translation": "string (natural translation)",
      "short_translation": "string (optional, shorter version)",
      "uncertain": boolean,
      "notes": []
    }}
  ],
  "page_summary": "string (summary of the page)"
}}

Regions to translate:
{json.dumps(regions_data, ensure_ascii=False, indent=2)}
"""

        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=payload, timeout=45.0)
            if res.status_code != 200:
                raise RuntimeError(f"OpenAI API page translation failed: {res.text}")
            
            data = res.json()
            try:
                text_response = data["choices"][0]["message"]["content"]
                result_json = json.loads(text_response)
                
                translations = []
                for item in result_json.get("translations", []):
                    translations.append(
                        TranslationItem(
                            id=item["id"],
                            translation=item["translation"],
                            short_translation=item.get("short_translation"),
                            uncertain=item.get("uncertain", False),
                            notes=item.get("notes", [])
                        )
                    )
                
                return PageTranslationResult(
                    translations=translations,
                    page_summary=result_json.get("page_summary"),
                    glossary_updates=[]
                )
            except Exception as e:
                raise RuntimeError(f"Failed to parse structured JSON from OpenAI: {e}. Raw: {data}")

import os
from pydantic import BaseModel
from typing import Literal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseModel):
    # Translation Settings
    translation_provider: Literal["mock", "openai", "gemini"] = os.getenv("MANGA_TRANSLATION_PROVIDER", "mock") # type: ignore
    translation_model: str = os.getenv("MANGA_TRANSLATION_MODEL", "mock-model")
    source_language: str = "ja"
    target_language: str = "en"
    
    # API Keys and Base URLs
    openai_api_key: str | None = os.getenv("MANGA_OPENAI_API_KEY")
    openai_api_base: str = os.getenv("MANGA_OPENAI_API_BASE", "https://api.openai.com/v1")
    gemini_api_key: str | None = os.getenv("MANGA_GEMINI_API_KEY")
    
    # OCR Settings
    device: Literal["cpu", "cuda"] = os.getenv("MANGA_DEVICE", "cpu") # type: ignore

settings = Settings()

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert data["detector_loaded"] is False
    assert "ocr_loaded" in data

def test_translate_selection_missing_file():
    response = client.post("/v1/translate-selection")
    assert response.status_code == 422

def test_deepseek_provider_configuration(monkeypatch):
    # Mock settings to return deepseek provider
    from app.config import settings
    monkeypatch.setattr(settings, "translation_provider", "deepseek")
    monkeypatch.setattr(settings, "deepseek_api_key", "fake-key")
    monkeypatch.setattr(settings, "translation_model", "mock-model")
    
    from app.translation.interface import get_translation_provider
    from app.translation.providers.deepseek_provider import DeepSeekTranslationProvider
    
    provider = get_translation_provider()
    assert isinstance(provider, DeepSeekTranslationProvider)
    assert provider.api_key == "fake-key"
    assert provider.model == "deepseek-chat"

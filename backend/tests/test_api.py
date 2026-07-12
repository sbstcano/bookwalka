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

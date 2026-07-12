import pytest
from pydantic import ValidationError
from app.translation.schemas import PageTranslationResult, SelectionTranslationResponse

def test_selection_translation_response_valid():
    # Valid Selection translation response
    data = {
        "japanese": "どうしてここにいるの？",
        "translation": "Why are you here?"
    }
    response = SelectionTranslationResponse(**data)
    assert response.japanese == "どうしてここにいるの？"
    assert response.translation == "Why are you here?"

def test_selection_translation_response_invalid():
    # Missing required field 'translation'
    data = {
        "japanese": "どうしてここにいるの？"
    }
    with pytest.raises(ValidationError):
        SelectionTranslationResponse(**data)

def test_page_translation_result_valid():
    # Valid Page translation response
    data = {
        "translations": [
            {
                "id": "r_001",
                "translation": "Why are you here?",
                "short_translation": "Why here?",
                "uncertain": False,
                "notes": []
            },
            {
                "id": "r_002",
                "translation": "That's my line.",
                "short_translation": "My line.",
                "uncertain": False,
                "notes": ["Test note"]
            }
        ],
        "page_summary": "Meeting of two characters.",
        "glossary_updates": []
    }
    result = PageTranslationResult(**data)
    assert len(result.translations) == 2
    assert result.translations[0].id == "r_001"
    assert result.translations[1].notes == ["Test note"]
    assert result.page_summary == "Meeting of two characters."

def test_page_translation_result_invalid():
    # Missing id in translation item
    data = {
        "translations": [
            {
                "translation": "Why are you here?"
            }
        ]
    }
    with pytest.raises(ValidationError):
        PageTranslationResult(**data)

from pathlib import Path

import pytest
import unidic_lite

from app.ocr.manga_ocr_engine import _validate_japanese_dictionary


def test_japanese_dictionary_is_available() -> None:
    _validate_japanese_dictionary()


def test_missing_japanese_dictionary_has_actionable_error(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(unidic_lite, "DICDIR", str(tmp_path))

    with pytest.raises(RuntimeError, match="Rebuild the backend with unidic_lite"):
        _validate_japanese_dictionary()

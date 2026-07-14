import logging
from pathlib import Path

from PIL import Image

logger = logging.getLogger("manga_ocr_engine")


def _validate_japanese_dictionary() -> None:
    """Fail with an actionable error when the packaged MeCab data is absent."""
    import unidic_lite

    dictionary_dir = Path(unidic_lite.DICDIR)
    required_files = ("mecabrc", "sys.dic", "matrix.bin")
    missing_files = [
        name for name in required_files if not (dictionary_dir / name).is_file()
    ]
    if missing_files:
        missing = ", ".join(missing_files)
        raise RuntimeError(
            "The Japanese OCR dictionary is incomplete "
            f"({dictionary_dir}; missing: {missing}). "
            "Rebuild the backend with unidic_lite package data included."
        )


class MangaOcrEngine:
    def __init__(self):
        self._mocr = None

    def load_model(self):
        if self._mocr is None:
            logger.info("Initializing MangaOcr engine...")
            _validate_japanese_dictionary()
            import os
            from manga_ocr import MangaOcr
            
            # Check if local model directory exists to avoid network calls
            possible_paths = ["/app/manga-ocr-base", "./manga-ocr-base", "manga-ocr-base"]
            model_path = "kha-white/manga-ocr-base"
            for path in possible_paths:
                if os.path.isdir(path):
                    model_path = path
                    logger.info(f"Using local OCR model weights from {path}")
                    break
            
            self._mocr = MangaOcr(model_path)
            logger.info("MangaOcr engine loaded successfully.")

    def ocr(self, image: Image.Image) -> str:
        self.load_model()
        if self._mocr is None:
            raise RuntimeError("MangaOcr engine failed to initialize.")
        return self._mocr(image)

    @property
    def is_loaded(self) -> bool:
        return self._mocr is not None

# Global engine instance
ocr_engine = MangaOcrEngine()

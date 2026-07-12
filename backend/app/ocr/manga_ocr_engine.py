import logging
from PIL import Image

logger = logging.getLogger("manga_ocr_engine")

class MangaOcrEngine:
    def __init__(self):
        self._mocr = None

    def load_model(self):
        if self._mocr is None:
            logger.info("Initializing MangaOcr engine...")
            from manga_ocr import MangaOcr
            self._mocr = MangaOcr()
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

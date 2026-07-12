import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.ocr.manga_ocr_engine import ocr_engine
from app.api import health, translate_selection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up FastAPI application...")
    # Preload the OCR engine model on startup
    try:
        ocr_engine.load_model()
        logger.info("OCR model preloaded successfully.")
    except Exception as e:
        logger.error(f"Failed to preload OCR model: {e}")
    yield
    logger.info("Shutting down FastAPI application...")

app = FastAPI(
    title="Bookwalka Translation Backend",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS to allow access from extension context
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict if necessary, but * is standard for local API servers serving browser content scripts
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(health.router)
app.include_router(translate_selection.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=True)

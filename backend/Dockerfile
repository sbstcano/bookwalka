FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    HF_HUB_ENABLE_HF_TRANSFER=1

WORKDIR /app

# Install system dependencies (compiler required for any potential native dependencies)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to utilize Docker layer caching
COPY requirements.txt .

# Install python dependencies and hf_transfer for ultra-fast model downloads
RUN pip install --no-cache-dir -r requirements.txt hf_transfer

# Copy the rest of the application code (including the local manga-ocr-base folder)
COPY . .

# Run the FastAPI application on the port provided by Cloud Run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

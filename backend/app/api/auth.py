from fastapi import Header, HTTPException, status
from app.config import settings

async def verify_api_key(x_api_key: str | None = Header(None)):
    # If no backend key is configured in env, allow all requests (for local dev)
    if not settings.backend_api_key:
        return
    
    # Require and validate the X-API-Key header
    if not x_api_key or x_api_key != settings.backend_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key (X-API-Key header)"
        )

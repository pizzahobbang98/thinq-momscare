from __future__ import annotations

from fastapi import Header, HTTPException

from app.config import get_settings


async def require_api_key(authorization: str | None = Header(default=None)) -> None:
    api_key = get_settings().mother_together_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "API key is not configured",
                "fix": [".env에 MOTHER_TOGETHER_API_KEY 값을 설정한 뒤 서버를 다시 시작하세요."],
            },
        )
    if authorization != f"Bearer {api_key}":
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": "Invalid API key",
                "fix": ["Authorization: Bearer <MOTHER_TOGETHER_API_KEY> 헤더를 확인하세요."],
            },
        )

from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from app.auth import require_api_key
from app.backends.base import BackendError, LightScene
from app.backends.home_assistant import HomeAssistantBackend
from app.backends.hueble import HueBleBackend
from app.config import get_settings


app = FastAPI(title="MotherTogether Hue Control", version="0.1.0")


SCENES = {
    "nausea-care": LightScene(brightness=80, rgb_color=(251, 231, 238)),
    "sleep-care": LightScene(brightness=35, color_temp_kelvin=2200),
    "vacation-mode": LightScene(brightness=150, rgb_color=(255, 215, 181)),
    "chores-care": LightScene(brightness=180, color_temp_kelvin=4000),
}


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "success": True,
        "service": "mother-hue-control",
        "backend": settings.light_backend,
    }


@app.get("/api/v1/light/scan")
async def scan(_: None = Depends(require_api_key)):
    return await _run("scan")


@app.post("/api/v1/light/on")
async def light_on(_: None = Depends(require_api_key)):
    return await _run("on")


@app.post("/api/v1/light/off")
async def light_off(_: None = Depends(require_api_key)):
    return await _run("off")


@app.post("/api/v1/light/nausea-care")
async def nausea_care(_: None = Depends(require_api_key)):
    return await _run("nausea-care")


@app.post("/api/v1/light/sleep-care")
async def sleep_care(_: None = Depends(require_api_key)):
    return await _run("sleep-care")


@app.post("/api/v1/light/vacation-mode")
async def vacation_mode(_: None = Depends(require_api_key)):
    return await _run("vacation-mode")


@app.post("/api/v1/light/chores-care")
async def chores_care(_: None = Depends(require_api_key)):
    return await _run("chores-care")


async def _run(action: str):
    settings = get_settings()
    backend = _backend(settings.light_backend)
    try:
        if action == "scan":
            devices = await backend.scan()
            return {"success": True, "backend": settings.light_backend, "devices": devices}
        if action == "off":
            details = await backend.turn_off()
            return {"success": True, "backend": settings.light_backend, "action": "light_off", "details": details}
        if action == "on":
            details = await backend.turn_on()
            return {"success": True, "backend": settings.light_backend, "action": "light_on", "details": details}
        details = await backend.turn_on(SCENES[action])
        return {"success": True, "backend": settings.light_backend, "mode": action, "details": details}
    except BackendError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "backend": settings.light_backend,
                "error": exc.error,
                "message": exc.message,
                "fix": exc.fix,
            },
        )


def _backend(name: str):
    settings = get_settings()
    if name == "home_assistant":
        return HomeAssistantBackend(settings)
    if name == "hueble":
        return HueBleBackend(settings)
    return HomeAssistantBackend(settings)

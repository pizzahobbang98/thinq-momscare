from __future__ import annotations

import asyncio
import inspect
import os
from dataclasses import dataclass

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth import require_api_key
from app.backends.base import BackendError, LightScene
from app.backends.home_assistant import HomeAssistantBackend
from app.backends.hueble import HueBleBackend
from app.config import get_settings
from app.light_palettes import HUE_COLOR_CYCLE_STEP_MS, HUE_MODE_PALETTES, HUE_SOLID_MODE_KEYS, hex_to_rgb


def _cors_origins() -> list[str]:
    configured = os.getenv("MOTHER_HUE_CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        *origins,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app = FastAPI(title="MotherTogether Hue Control", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.getenv("MOTHER_HUE_CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "ngrok-skip-browser-warning"],
)

_BACKEND_CACHE: dict[str, object] = {}


MAX_HA_BRIGHTNESS = 255


@dataclass(frozen=True)
class ModeScene:
    palette: tuple[str, ...]
    effect_step_ms: int = HUE_COLOR_CYCLE_STEP_MS

    @property
    def rgb_color(self) -> tuple[int, int, int]:
        return hex_to_rgb(self.palette[0])

    def to_light_scene(self) -> LightScene:
        return LightScene(brightness=MAX_HA_BRIGHTNESS, rgb_color=self.rgb_color)


class LightModeRequest(BaseModel):
    mode: str | None = None
    effect: str | None = "solid"
    source: str | None = None
    hex: str | None = None
    color: str | None = None
    colorHex: str | None = None
    brightness: int | None = None
    brightnessPercent: int | None = None

    def requested_hex(self) -> str | None:
        return self.hex or self.colorHex or self.color


SCENES: dict[str, ModeScene] = {mode: ModeScene(palette=palette) for mode, palette in HUE_MODE_PALETTES.items()}

MODE_ALIASES = {
    "default": "default",
    "idle": "default",
    "base": "default",
    "standby": "default",
    "nausea-care": "nausea-care",
    "nausea-food": "nausea-care",
    "nausea-mode": "nausea-care",
    "sleep-care": "sleep-care",
    "sleep-mode": "sleep-care",
    "chores-care": "chores-care",
    "housework-care": "chores-care",
    "housework-mode": "chores-care",
    "vacation-mode": "vacation-ocean",
    "travel-mode": "vacation-ocean",
    "travel-ocean": "vacation-ocean",
    "destination-ocean": "vacation-ocean",
    "vacation-ocean": "vacation-ocean",
    "ocean": "vacation-ocean",
    "travel-forest": "vacation-forest",
    "destination-forest": "vacation-forest",
    "vacation-forest": "vacation-forest",
    "forest": "vacation-forest",
    "travel-city": "vacation-city",
    "destination-city": "vacation-city",
    "vacation-city": "vacation-city",
    "city": "vacation-city",
    "condition": "condition-balance",
    "condition-balance": "condition-balance",
    "sleep-rhythm": "sleep-rhythm",
    "refresh": "mood-refresh",
    "mood-refresh": "mood-refresh",
    "rest-ready": "rest-prepare",
    "rest-prepare": "rest-prepare",
    "couple-routine": "couple-dinner",
    "couple-dinner": "couple-dinner",
}

NO_OP_MODE_KEYS = {"", "none", "null", "undefined"}


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "success": True,
        "service": "mother-hue-control",
        "backend": settings.light_backend,
    }


@app.on_event("shutdown")
async def shutdown_backends():
    await _close_backends()


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


@app.post("/api/v1/light/mode")
async def light_mode(body: LightModeRequest, _: None = Depends(require_api_key)):
    return await _run(body.mode or "", effect=body.effect, hex_color=body.requested_hex())


@app.post("/api/v1/light/{mode_name}")
async def light_mode_alias(mode_name: str, _: None = Depends(require_api_key)):
    return await _run(mode_name)


async def _run(action: str, effect: str | None = None, hex_color: str | None = None):
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
            scene = SCENES["default"]
            details = await backend.turn_on(scene.to_light_scene())
            return {
                "success": True,
                "backend": settings.light_backend,
                "action": "light_on",
                "hex_color": scene.palette[0],
                "rgb_color": list(scene.rgb_color),
                "details": details,
            }
        mode = _resolve_mode(action)
        if mode is None:
            return {
                "success": True,
                "backend": settings.light_backend,
                "skipped": True,
                "reason": "No light action for default mode",
                "mode": action,
            }
        if mode not in SCENES:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "backend": settings.light_backend,
                    "error": "Unsupported mode",
                    "mode": action,
                    "supported_modes": sorted(SCENES.keys()),
                },
            )
        details = await _apply_mode(backend, settings.light_backend, mode, effect, hex_color)
        return {"success": True, "backend": settings.light_backend, "mode": mode, "details": details}
    except BackendError as exc:
        content = {
            "success": False,
            "backend": settings.light_backend,
            "error": exc.error,
            "message": exc.message,
            "fix": exc.fix,
        }
        if exc.failure:
            content["failure"] = exc.failure
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "backend": settings.light_backend,
                "error": "Unexpected light control failure",
                "message": f"{exc.__class__.__name__}: {exc}",
                "fix": ["서버 로그와 Hue backend 설정을 확인하세요."],
            },
        )


def _backend(name: str):
    settings = get_settings()
    if name in _BACKEND_CACHE:
        return _BACKEND_CACHE[name]
    if name == "home_assistant":
        backend = HomeAssistantBackend(settings)
    elif name == "hueble":
        backend = HueBleBackend(settings)
    else:
        backend = HomeAssistantBackend(settings)
    _BACKEND_CACHE[name] = backend
    return backend


async def _close_backends() -> None:
    for backend in list(_BACKEND_CACHE.values()):
        close = getattr(backend, "close", None)
        if not callable(close):
            continue
        result = close()
        if inspect.isawaitable(result):
            await result


async def _apply_mode(backend, backend_name: str, mode: str, effect: str | None, hex_color: str | None = None) -> dict:
    scene = _scene_with_requested_hex(SCENES[mode], hex_color)
    if mode in HUE_SOLID_MODE_KEYS:
        details = await backend.turn_on(scene.to_light_scene())
        return {
            "effect": "solid",
            "brightness": MAX_HA_BRIGHTNESS,
            "hex_color": scene.palette[0],
            "rgb_color": list(scene.rgb_color),
            "palette": [scene.palette[0]],
            "details": details,
        }

    start_mode_cycle = getattr(backend, "start_mode_cycle", None)
    if backend_name == "hueble" and callable(start_mode_cycle):
        details = await start_mode_cycle(mode, scene.to_light_scene(), scene.palette, scene.effect_step_ms)
        return {
            "effect": details.get("effect", "deep-color-cycle"),
            "brightness": MAX_HA_BRIGHTNESS,
            "hex_color": scene.palette[0],
            "rgb_color": list(scene.rgb_color),
            "palette": list(scene.palette),
            "details": details,
        }

    effect_name = (effect or "solid").strip().lower()
    if effect_name not in {"gradient", "soft-gradient"}:
        details = await backend.turn_on(scene.to_light_scene())
        return {
            "effect": "solid",
            "brightness": MAX_HA_BRIGHTNESS,
            "hex_color": scene.palette[0],
            "rgb_color": list(scene.rgb_color),
            "details": details,
        }

    return await _apply_gradient(backend, backend_name, mode, scene)


async def _apply_gradient(backend, backend_name: str, mode: str, scene: ModeScene) -> dict:
    steps = _build_gradient_scenes(scene)
    applied_steps = []

    try:
        for index, step_scene in enumerate(steps):
            details = await backend.turn_on(step_scene)
            applied_steps.append(
                {
                    "step": index + 1,
                    "brightness": step_scene.brightness,
                    "rgb_color": list(step_scene.rgb_color or scene.rgb_color),
                    "details": details,
                }
            )
            if index < len(steps) - 1:
                await asyncio.sleep(scene.effect_step_ms / 1000)
    except BackendError as exc:
        if backend_name == "hueble":
            fallback_details = await backend.turn_on(scene.to_light_scene())
            return {
                "effect": "solid",
                "fallback": True,
                "gradient_failed": True,
                "gradient_error": exc.message,
                "attempted_steps": len(applied_steps),
                "brightness": MAX_HA_BRIGHTNESS,
                "hex_color": scene.palette[0],
                "rgb_color": list(scene.rgb_color),
                "details": fallback_details,
            }
        raise

    return {
        "effect": "gradient",
        "mode": mode,
        "steps": len(applied_steps),
        "effect_step_ms": scene.effect_step_ms,
        "brightness": MAX_HA_BRIGHTNESS,
        "hex_color": scene.palette[0],
        "final_rgb_color": list(scene.rgb_color),
        "applied_steps": applied_steps,
    }


def _build_gradient_scenes(scene: ModeScene) -> list[LightScene]:
    return [
        LightScene(brightness=MAX_HA_BRIGHTNESS, rgb_color=hex_to_rgb(hex_color))
        for hex_color in scene.palette
    ]


def _scene_with_requested_hex(scene: ModeScene, hex_color: str | None) -> ModeScene:
    normalized = _normalize_hex_color(hex_color)
    if normalized is None:
        return scene
    return ModeScene(palette=(normalized, *scene.palette[1:]), effect_step_ms=scene.effect_step_ms)


def _normalize_hex_color(hex_color: str | None) -> str | None:
    if not hex_color:
        return None
    value = hex_color.strip()
    if not value:
        return None
    if not value.startswith("#"):
        value = f"#{value}"
    hex_to_rgb(value)
    return f"#{value.strip().lstrip('#').upper()}"


def _resolve_mode(value: str | None) -> str | None:
    key = _mode_lookup_key(value)
    if key in NO_OP_MODE_KEYS:
        return None
    return MODE_ALIASES.get(key, key if key in SCENES else "")


def _mode_lookup_key(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip().replace("_", "-").lower()

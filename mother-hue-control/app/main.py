from __future__ import annotations

import asyncio
import colorsys
import math
from dataclasses import dataclass

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth import require_api_key
from app.backends.base import BackendError, LightScene
from app.backends.home_assistant import HomeAssistantBackend
from app.backends.hueble import HueBleBackend
from app.config import get_settings


app = FastAPI(title="MotherTogether Hue Control", version="0.1.0")


MAX_HA_BRIGHTNESS = 255
GRADIENT_STEPS = 10


@dataclass(frozen=True)
class ModeScene:
    rgb_color: tuple[int, int, int]
    effect_step_ms: int = 650

    def to_light_scene(self) -> LightScene:
        return LightScene(brightness=MAX_HA_BRIGHTNESS, rgb_color=self.rgb_color)


class LightModeRequest(BaseModel):
    mode: str | None = None
    effect: str | None = "gradient"
    source: str | None = None


SCENES: dict[str, ModeScene] = {
    "nausea-care": ModeScene(rgb_color=(251, 231, 238), effect_step_ms=600),
    "sleep-care": ModeScene(rgb_color=(255, 184, 120), effect_step_ms=700),
    "chores-care": ModeScene(rgb_color=(255, 244, 229), effect_step_ms=600),
    "vacation-ocean": ModeScene(rgb_color=(227, 244, 255), effect_step_ms=600),
    "vacation-forest": ModeScene(rgb_color=(232, 244, 223), effect_step_ms=650),
    "vacation-city": ModeScene(rgb_color=(123, 97, 255), effect_step_ms=650),
    "condition-balance": ModeScene(rgb_color=(232, 215, 163), effect_step_ms=600),
    "sleep-rhythm": ModeScene(rgb_color=(109, 123, 224), effect_step_ms=700),
    "mood-refresh": ModeScene(rgb_color=(196, 182, 255), effect_step_ms=650),
    "rest-prepare": ModeScene(rgb_color=(255, 200, 135), effect_step_ms=700),
    "couple-dinner": ModeScene(rgb_color=(232, 160, 168), effect_step_ms=650),
}

MODE_ALIASES = {
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

NO_OP_MODE_KEYS = {"", "default", "idle", "none", "null", "undefined"}


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


@app.post("/api/v1/light/mode")
async def light_mode(body: LightModeRequest, _: None = Depends(require_api_key)):
    return await _run(body.mode or "", effect=body.effect)


@app.post("/api/v1/light/{mode_name}")
async def light_mode_alias(mode_name: str, _: None = Depends(require_api_key)):
    return await _run(mode_name)


async def _run(action: str, effect: str | None = None):
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
        details = await _apply_mode(backend, settings.light_backend, mode, effect)
        return {"success": True, "backend": settings.light_backend, "mode": mode, "details": details}
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
    if name == "home_assistant":
        return HomeAssistantBackend(settings)
    if name == "hueble":
        return HueBleBackend(settings)
    return HomeAssistantBackend(settings)


async def _apply_mode(backend, backend_name: str, mode: str, effect: str | None) -> dict:
    scene = SCENES[mode]
    effect_name = (effect or "gradient").strip().lower()
    if effect_name not in {"gradient", "soft-gradient"}:
        details = await backend.turn_on(scene.to_light_scene())
        return {
            "effect": "solid",
            "brightness": MAX_HA_BRIGHTNESS,
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
        "final_rgb_color": list(scene.rgb_color),
        "applied_steps": applied_steps,
    }


def _build_gradient_scenes(scene: ModeScene) -> list[LightScene]:
    return [
        LightScene(brightness=MAX_HA_BRIGHTNESS, rgb_color=rgb_color)
        for rgb_color in _similar_rgb_palette(scene.rgb_color, GRADIENT_STEPS)
    ]


def _similar_rgb_palette(base_rgb: tuple[int, int, int], steps: int) -> list[tuple[int, int, int]]:
    if steps <= 1:
        return [base_rgb]

    red, green, blue = [channel / 255 for channel in base_rgb]
    hue, lightness, saturation = colorsys.rgb_to_hls(red, green, blue)
    colors: list[tuple[int, int, int]] = []
    variation_count = steps - 1

    for index in range(variation_count):
        progress = 0.5 if variation_count == 1 else index / (variation_count - 1)
        hue_offset = (-8 + progress * 16) / 360
        saturation_offset = math.sin(progress * math.pi * 2) * 0.045
        lightness_offset = math.cos(progress * math.pi * 2) * 0.035
        next_hue = (hue + hue_offset) % 1
        next_lightness = _clamp(lightness + lightness_offset, 0.08, 0.96)
        next_saturation = _clamp(saturation + saturation_offset, 0.04, 1)
        next_red, next_green, next_blue = colorsys.hls_to_rgb(next_hue, next_lightness, next_saturation)
        colors.append(
            (
                _channel_to_int(next_red),
                _channel_to_int(next_green),
                _channel_to_int(next_blue),
            )
        )

    colors.append(base_rgb)
    return colors


def _resolve_mode(value: str | None) -> str | None:
    key = _mode_lookup_key(value)
    if key in NO_OP_MODE_KEYS:
        return None
    return MODE_ALIASES.get(key, key if key in SCENES else "")


def _mode_lookup_key(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip().replace("_", "-").lower()


def _channel_to_int(value: float) -> int:
    return int(round(_clamp(value, 0, 1) * 255))


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))

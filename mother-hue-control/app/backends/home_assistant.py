from __future__ import annotations

import httpx

from app.backends.base import BackendConfigurationError, BackendError, LightScene
from app.config import Settings


class HomeAssistantBackend:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def scan(self) -> list[dict]:
        self._require_config(include_entity=False)
        states = await self._request("GET", "/api/states")
        devices = []
        for item in states:
            entity_id = item.get("entity_id", "")
            attrs = item.get("attributes", {})
            name = attrs.get("friendly_name") or entity_id
            haystack = f"{entity_id} {name}".lower()
            if entity_id.startswith("light.") and ("hue" in haystack or "lamp" in haystack):
                devices.append({"name": name, "address": entity_id, "rssi": None})
        return devices

    async def turn_on(self, scene: LightScene | None = None) -> dict:
        self._require_config()
        payload = {"entity_id": self.settings.ha_entity_id}
        if scene:
            payload.update(self._scene_payload(scene))
        await self._request("POST", "/api/services/light/turn_on", json=payload)
        return {"entity_id": self.settings.ha_entity_id, "payload": payload}

    async def turn_off(self) -> dict:
        self._require_config()
        payload = {"entity_id": self.settings.ha_entity_id}
        await self._request("POST", "/api/services/light/turn_off", json=payload)
        return {"entity_id": self.settings.ha_entity_id}

    def _require_config(self, include_entity: bool = True) -> None:
        missing = []
        if not self.settings.ha_url:
            missing.append("HA_URL")
        if not self.settings.ha_token:
            missing.append("HA_TOKEN")
        if include_entity and not self.settings.ha_entity_id:
            missing.append("HA_ENTITY_ID")
        if missing:
            raise BackendConfigurationError(
                "Home Assistant backend needs more .env values.",
                [f".env에 {', '.join(missing)} 값을 설정하세요."],
            )

    async def _request(self, method: str, path: str, json: dict | None = None):
        base_url = self.settings.ha_url.rstrip("/")
        headers = {
            "Authorization": f"Bearer {self.settings.ha_token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.request(method, f"{base_url}{path}", headers=headers, json=json)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise BackendError(
                f"Home Assistant returned HTTP {exc.response.status_code}.",
                [
                    "HA_URL, HA_TOKEN, HA_ENTITY_ID가 맞는지 확인하세요.",
                    "Home Assistant에서 Philips Hue BLE integration이 전구를 제어할 수 있는지 확인하세요.",
                ],
            ) from exc
        except httpx.RequestError as exc:
            raise BackendError(
                "Home Assistant is not reachable.",
                [
                    "Home Assistant가 실행 중인지 확인하세요.",
                    "HA_URL이 이 PC에서 접근 가능한 주소인지 확인하세요.",
                ],
            ) from exc
        if response.content:
            return response.json()
        return {}

    def _scene_payload(self, scene: LightScene) -> dict:
        payload = {}
        if scene.brightness is not None:
            payload["brightness"] = max(1, min(255, scene.brightness))
        if scene.rgb_color is not None:
            payload["rgb_color"] = list(scene.rgb_color)
        if scene.xy_color is not None:
            payload["xy_color"] = [scene.xy_color[0], scene.xy_color[1]]
        if scene.color_temp_kelvin is not None:
            payload["color_temp_kelvin"] = scene.color_temp_kelvin
        return payload

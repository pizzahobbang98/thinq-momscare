from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class LightScene:
    brightness: int | None = None
    rgb_color: tuple[int, int, int] | None = None
    color_temp_kelvin: int | None = None
    xy_color: tuple[float, float] | None = None


class BackendError(Exception):
    status_code = 502
    error = "Light backend failed"

    def __init__(self, message: str, fix: list[str] | None = None):
        super().__init__(message)
        self.message = message
        self.fix = fix or []


class BackendConfigurationError(BackendError):
    status_code = 500
    error = "Light backend is not configured"


class BluetoothAuthorizationError(BackendError):
    status_code = 502
    error = "Bluetooth authorization failed"


class LightBackend(Protocol):
    async def scan(self) -> list[dict]:
        ...

    async def turn_on(self, scene: LightScene | None = None) -> dict:
        ...

    async def turn_off(self) -> dict:
        ...


BLUETOOTH_FIXES = [
    "Hue 앱에서 전구 제어가 되는지 먼저 확인하세요.",
    "Hue 앱 > Settings > Voice Assistants > Google Home 또는 Alexa > Make Discoverable을 누르세요.",
    "휴대폰 Bluetooth를 끄고 Hue 앱을 완전히 종료하세요.",
    "Windows Bluetooth 설정에서 기존 Philips Hue / Hue color lamp 장치를 제거하세요.",
    "노트북을 전구 1m 안쪽에 두고 다시 시도하세요.",
    "계속 실패하면 LIGHT_BACKEND=home_assistant로 전환하세요.",
]


def rgb_to_xy(rgb: tuple[int, int, int]) -> tuple[float, float]:
    red, green, blue = [channel / 255 for channel in rgb]

    def gamma_correct(value: float) -> float:
        if value > 0.04045:
            return ((value + 0.055) / 1.055) ** 2.4
        return value / 12.92

    red = gamma_correct(red)
    green = gamma_correct(green)
    blue = gamma_correct(blue)

    x = red * 0.664511 + green * 0.154324 + blue * 0.162028
    y = red * 0.283881 + green * 0.668433 + blue * 0.047685
    z = red * 0.000088 + green * 0.072310 + blue * 0.986039
    total = x + y + z
    if total == 0:
        return (0.3127, 0.3290)
    return (round(x / total, 4), round(y / total, 4))

from __future__ import annotations

import asyncio
import importlib
import inspect
import platform

from app.backends.base import (
    BLUETOOTH_FIXES,
    BackendConfigurationError,
    BackendError,
    BluetoothAuthorizationError,
    LightScene,
    rgb_to_xy,
)
from app.config import Settings


UUID_HUE_IDENTIFIER = "0000fe0f-0000-1000-8000-00805f9b34fb"
UUID_POWER = "932c32bd-0002-47a2-835a-a8d455b859dd"
UUID_BRIGHTNESS = "932c32bd-0003-47a2-835a-a8d455b859dd"
UUID_TEMPERATURE = "932c32bd-0004-47a2-835a-a8d455b859dd"
UUID_XY_COLOUR = "932c32bd-0005-47a2-835a-a8d455b859dd"


class HueBleBackend:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._light = None

    async def scan(self) -> list[dict]:
        try:
            from bleak import BleakScanner
        except ImportError as exc:
            raise BackendConfigurationError(
                "Bleak is not installed.",
                ["pip install bleak HueBLE bleak-retry-connector를 실행하세요."],
            ) from exc

        try:
            devices = await BleakScanner.discover(timeout=self.settings.ble_scan_timeout, return_adv=True)
        except Exception as exc:
            raise BackendError(
                "Bluetooth scan failed.",
                [
                    "Windows 설정 > 개인정보 및 보안 > Bluetooth에서 데스크톱 앱 접근을 허용하세요.",
                    "관리자 PowerShell에서 다시 실행해 보세요.",
                ],
            ) from exc

        found = []
        for device, adv in devices.values():
            name = device.name or adv.local_name or "Unknown BLE device"
            service_uuids = adv.service_uuids or []
            if UUID_HUE_IDENTIFIER in service_uuids or self._looks_like_hue(name):
                found.append(
                    {
                        "name": name,
                        "address": device.address,
                        "rssi": getattr(adv, "rssi", None),
                    }
                )
        return found

    async def turn_on(self, scene: LightScene | None = None) -> dict:
        writes = [(UUID_POWER, b"\x01")]
        applied = {"power": True}
        if scene:
            if scene.brightness is not None:
                brightness = max(1, min(254, scene.brightness))
                writes.append((UUID_BRIGHTNESS, bytes([brightness])))
                applied["brightness"] = brightness
            xy = scene.xy_color or (rgb_to_xy(scene.rgb_color) if scene.rgb_color else None)
            if xy is not None:
                writes.append((UUID_XY_COLOUR, self._xy_bytes(xy)))
                applied["xy_color"] = xy
            if scene.color_temp_kelvin is not None:
                writes.append((UUID_TEMPERATURE, self._mired_bytes(scene.color_temp_kelvin)))
                applied["color_temp_kelvin"] = scene.color_temp_kelvin
        await self._write_gatt_values(writes)
        return applied

    async def turn_off(self) -> dict:
        await self._write_gatt_values([(UUID_POWER, b"\x00")])
        return {"power": False}

    async def _write_gatt_values(self, writes: list[tuple[str, bytes]]) -> None:
        device = await self._find_device()
        try:
            from bleak import BleakClient
        except ImportError as exc:
            raise BackendConfigurationError(
                "Bleak is not installed.",
                ["pip install bleak HueBLE bleak-retry-connector를 실행하세요."],
            ) from exc

        try:
            async with BleakClient(device, timeout=25) as client:
                if self.settings.hue_ble_auto_pair and platform.system() == "Windows":
                    await asyncio.wait_for(client.pair(), timeout=30)
                for uuid, data in writes:
                    await client.write_gatt_char(uuid, data, response=True)
        except Exception as exc:
            if self._is_auth_error(exc):
                raise BluetoothAuthorizationError(self._exception_chain(exc), BLUETOOTH_FIXES) from exc
            raise BackendError(f"Bluetooth write failed: {self._exception_chain(exc)}", BLUETOOTH_FIXES) from exc

    async def _find_device(self):
        if not self.settings.hue_ble_address:
            raise BackendConfigurationError(
                "HueBLE backend needs HUE_BLE_ADDRESS.",
                ["/api/v1/light/scan으로 전구 주소를 찾은 뒤 .env에 HUE_BLE_ADDRESS를 설정하세요."],
            )
        try:
            from bleak import BleakScanner
        except ImportError as exc:
            raise BackendConfigurationError(
                "Bleak is not installed.",
                ["pip install bleak HueBLE bleak-retry-connector를 실행하세요."],
            ) from exc
        try:
            device = await BleakScanner.find_device_by_address(
                self.settings.hue_ble_address,
                timeout=self.settings.ble_scan_timeout,
            )
        except Exception as exc:
            raise BackendError("Hue light lookup failed.", BLUETOOTH_FIXES) from exc
        if device is None:
            raise BackendError("Hue light not found.", BLUETOOTH_FIXES)
        return device

    def _xy_bytes(self, xy: tuple[float, float]) -> bytes:
        x = max(0, min(0xFFFF, int(xy[0] * 0xFFFF)))
        y = max(0, min(0xFFFF, int(xy[1] * 0xFFFF)))
        return x.to_bytes(2, "little") + y.to_bytes(2, "little")

    def _mired_bytes(self, kelvin: int) -> bytes:
        mired = max(153, min(500, round(1_000_000 / kelvin)))
        return mired.to_bytes(2, "little")

    async def _get_light(self):
        if self._light is not None:
            return self._light
        if not self.settings.hue_ble_address:
            raise BackendConfigurationError(
                "HueBLE backend needs HUE_BLE_ADDRESS.",
                ["/api/v1/light/scan으로 전구 주소를 찾은 뒤 .env에 HUE_BLE_ADDRESS를 설정하세요."],
            )

        try:
            from bleak import BleakScanner
        except ImportError as exc:
            raise BackendConfigurationError(
                "Bleak is not installed.",
                ["pip install bleak HueBLE bleak-retry-connector를 실행하세요."],
            ) from exc

        hueble = self._import_hueble()
        try:
            device = await BleakScanner.find_device_by_address(
                self.settings.hue_ble_address,
                timeout=self.settings.ble_scan_timeout,
            )
        except Exception as exc:
            raise BackendError("Hue light lookup failed.", BLUETOOTH_FIXES) from exc
        if device is None:
            raise BackendError("Hue light not found.", BLUETOOTH_FIXES)

        if self.settings.hue_ble_auto_pair:
            await self._ensure_windows_pairing(device)

        light_class = self._find_light_class(hueble)
        try:
            self._light = light_class(device)
        except Exception as exc:
            raise BluetoothAuthorizationError("HueBLE light initialization failed.", BLUETOOTH_FIXES) from exc
        return self._light

    def _import_hueble(self):
        self._patch_bleak_backend_enum()
        for module_name in ("HueBLE", "hueble"):
            try:
                return importlib.import_module(module_name)
            except ImportError:
                continue
        raise BackendConfigurationError(
            "HueBLE is not installed.",
            ["pip install HueBLE bleak bleak-retry-connector를 실행하세요."],
        )

    def _patch_bleak_backend_enum(self) -> None:
        try:
            import bleak.backends as bleak_backends
        except ImportError:
            return
        if hasattr(bleak_backends, "BleakBackend"):
            return

        class BleakBackendShim:
            BLUEZ_DBUS = object()

        bleak_backends.BleakBackend = BleakBackendShim

    async def _ensure_windows_pairing(self, device) -> None:
        if platform.system() != "Windows":
            return
        try:
            from bleak import BleakClient
        except ImportError:
            return

        try:
            async with BleakClient(device, timeout=25) as client:
                await asyncio.wait_for(client.pair(), timeout=30)
        except Exception as exc:
            if self._is_auth_error(exc):
                raise BluetoothAuthorizationError(self._exception_chain(exc), BLUETOOTH_FIXES) from exc
            raise BackendError(f"Windows Bluetooth pairing failed: {self._exception_chain(exc)}", BLUETOOTH_FIXES) from exc

    def _find_light_class(self, hueble):
        for class_name in ("HueBleLight", "HueBLELight", "HueLight", "Light"):
            if hasattr(hueble, class_name):
                return getattr(hueble, class_name)
        raise BackendConfigurationError(
            "Installed HueBLE package has an unknown API.",
            [f"사용 가능한 HueBLE 속성: {', '.join(sorted(name for name in dir(hueble) if not name.startswith('_'))[:25])}"],
        )

    async def _set_brightness(self, light, brightness: int) -> None:
        await self._call_any(light, ["set_brightness", "set_bri", "set_brightness_level"], max(1, min(254, brightness)))

    async def _set_xy(self, light, xy: tuple[float, float]) -> None:
        for method_name in ("set_colour_xy", "set_color_xy"):
            method = getattr(light, method_name, None)
            if method:
                await self._maybe_await(method(xy[0], xy[1]))
                return
        await self._call_any(light, ["set_xy"], xy)

    async def _set_color_temp(self, light, kelvin: int) -> None:
        mired = round(1_000_000 / kelvin)
        for method_name in ("set_colour_temp", "set_colour_temperature", "set_color_temperature", "set_color_temp", "set_ct"):
            method = getattr(light, method_name, None)
            if not method:
                continue
            await self._maybe_await(method(mired))
            return
        raise BackendConfigurationError(
            "HueBLE color temperature method was not found.",
            ["이 HueBLE 버전에서 색온도 메서드 이름을 확인하거나 Home Assistant backend를 사용하세요."],
        )

    async def _call_any(self, target, method_names: list[str], *args) -> None:
        for method_name in method_names:
            method = getattr(target, method_name, None)
            if not method:
                continue
            try:
                await self._maybe_await(method(*args))
                return
            except Exception as exc:
                if self._is_auth_error(exc):
                    raise BluetoothAuthorizationError(self._exception_chain(exc), BLUETOOTH_FIXES) from exc
                raise BackendError(
                    f"HueBLE method {method_name} failed: {self._exception_chain(exc)}",
                    BLUETOOTH_FIXES,
                ) from exc
        available = ", ".join(name for name, value in inspect.getmembers(target) if callable(value) and not name.startswith("_"))
        raise BackendConfigurationError(
            f"HueBLE method not found: one of {', '.join(method_names)}.",
            [f"현재 light 객체의 메서드: {available[:500]}"],
        )

    async def _maybe_await(self, value):
        if inspect.isawaitable(value):
            return await value
        return value

    def _is_auth_error(self, exc: Exception) -> bool:
        text = self._exception_chain(exc).lower()
        return any(
            token in text
            for token in (
                "auth",
                "pair",
                "permission",
                "not authorized",
                "access",
                "readwriteerror",
                "unable to write",
                "unable to read",
            )
        )

    def _exception_chain(self, exc: Exception) -> str:
        parts = []
        seen = set()
        current: BaseException | None = exc
        while current is not None and id(current) not in seen:
            seen.add(id(current))
            parts.append(f"{current.__class__.__name__}: {current}")
            current = current.__cause__ or current.__context__
        return " <- ".join(parts)

    def _device_to_dict(self, device) -> dict:
        name = getattr(device, "name", None) or "Unknown Hue device"
        address = getattr(device, "address", None) or getattr(device, "mac", None) or getattr(device, "id", None) or ""
        rssi = getattr(device, "rssi", None)
        return {"name": name, "address": address, "rssi": rssi}

    def _looks_like_hue(self, name: str) -> bool:
        lower = name.lower()
        return any(token in lower for token in ("hue", "philips", "lca006", "lca011", "color lamp"))

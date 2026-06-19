from __future__ import annotations

import asyncio
import importlib
import inspect
import logging
import platform
from contextlib import suppress

from app.backends.base import (
    BLUETOOTH_FIXES,
    BackendConfigurationError,
    BackendError,
    BluetoothAuthorizationError,
    LightScene,
    rgb_to_xy,
)
from app.config import Settings
from app.light_palettes import HUE_COLOR_CYCLE_SECONDS, HUE_MODE_PALETTES


UUID_HUE_IDENTIFIER = "0000fe0f-0000-1000-8000-00805f9b34fb"
UUID_POWER = "932c32bd-0002-47a2-835a-a8d455b859dd"
UUID_BRIGHTNESS = "932c32bd-0003-47a2-835a-a8d455b859dd"
UUID_TEMPERATURE = "932c32bd-0004-47a2-835a-a8d455b859dd"
UUID_XY_COLOUR = "932c32bd-0005-47a2-835a-a8d455b859dd"

BLE_CONNECT_TIMEOUT = 20
BLE_PAIR_TIMEOUT = 30
BLE_RECONNECT_DELAY_SECONDS = 0.5
BLE_WRITE_ATTEMPTS = 4
BLE_WRITE_COOLDOWN_SECONDS = 0.3

logger = logging.getLogger(__name__)


class HueBleBackend:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._light = None
        self._client = None
        self._client_address: str | None = None
        self._paired_once = False
        self._last_write_finished_at = 0.0
        self._write_lock = asyncio.Lock()
        self._color_cycle_task: asyncio.Task | None = None
        self._color_cycle_mode: str | None = None

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
        await self._stop_color_cycle()
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
        await self._stop_color_cycle()
        await self._write_gatt_values([(UUID_POWER, b"\x00")])
        return {"power": False}

    async def start_mode_cycle(
        self,
        mode: str,
        scene: LightScene | None = None,
        palette: tuple[str, ...] | None = None,
        effect_step_ms: int | None = None,
    ) -> dict:
        palette = palette or HUE_MODE_PALETTES.get(mode)
        if not palette:
            return await self.turn_on(scene)

        await self._stop_color_cycle()

        await self._write_color_cycle_step(palette[0], scene)
        self._color_cycle_mode = mode
        cycle_seconds = (effect_step_ms / 1000) if effect_step_ms else HUE_COLOR_CYCLE_SECONDS
        self._color_cycle_task = asyncio.create_task(self._run_color_cycle(mode, palette, scene, cycle_seconds))

        return {
            "power": True,
            "effect": "deep-color-cycle",
            "mode": mode,
            "palette": list(palette),
            "cycle_seconds": cycle_seconds,
            "first_color": palette[0],
        }

    async def _run_color_cycle(
        self,
        mode: str,
        palette: tuple[str, ...],
        scene: LightScene | None,
        cycle_seconds: float,
    ) -> None:
        index = 1
        try:
            while True:
                await asyncio.sleep(cycle_seconds)
                if self._color_cycle_mode != mode:
                    return
                await self._write_color_cycle_step(palette[index], scene)
                index = (index + 1) % len(palette)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning(
                "Hue BLE color cycle stopped after write failure for %s: %s",
                mode,
                self._exception_chain(exc),
            )

    async def _stop_color_cycle(self) -> None:
        task = self._color_cycle_task
        self._color_cycle_task = None
        self._color_cycle_mode = None
        if task is None or task.done():
            return
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

    async def _write_color_cycle_step(self, hex_color: str, scene: LightScene | None) -> None:
        rgb = self._hex_to_rgb(hex_color)
        brightness = max(1, min(254, scene.brightness if scene and scene.brightness is not None else 254))
        await self._write_gatt_values(
            [
                (UUID_POWER, b"\x01"),
                (UUID_BRIGHTNESS, bytes([brightness])),
                (UUID_XY_COLOUR, self._xy_bytes(rgb_to_xy(rgb))),
            ]
        )

    async def _write_gatt_values(self, writes: list[tuple[str, bytes]]) -> None:
        address = self._require_hue_ble_address()
        try:
            from bleak import BleakClient
        except ImportError as exc:
            raise BackendConfigurationError(
                "Bleak is not installed.",
                ["pip install bleak HueBLE bleak-retry-connector를 실행하세요."],
            ) from exc

        async with self._write_lock:
            await self._apply_write_cooldown()
            pairing_errors: list[str] = []
            last_exc: Exception | None = None

            for attempt in range(1, BLE_WRITE_ATTEMPTS + 1):
                try:
                    client = await self._ensure_client(BleakClient, address, pairing_errors)
                    for uuid, data in writes:
                        await client.write_gatt_char(uuid, data, response=True)
                    self._last_write_finished_at = asyncio.get_running_loop().time()
                    return
                except Exception as exc:
                    last_exc = exc
                    logger.warning(
                        "Hue BLE write attempt %s/%s failed; reconnecting before retry: %s",
                        attempt,
                        BLE_WRITE_ATTEMPTS,
                        self._exception_chain(exc),
                    )
                    await self._reset_client()
                    if attempt < BLE_WRITE_ATTEMPTS:
                        await asyncio.sleep(self._retry_delay(attempt, exc))

            if last_exc is None:
                raise BackendError("Bluetooth write failed without an exception.", BLUETOOTH_FIXES, failure="write_failed")
            self._raise_write_failure(last_exc, pairing_errors, fallback_used=True)

    async def close(self) -> None:
        await self._stop_color_cycle()
        async with self._write_lock:
            await self._reset_client()

    async def _ensure_client(self, bleak_client_class, address: str, pairing_errors: list[str]):
        if self._client is not None and self._client_address == address and await self._is_client_connected(self._client):
            return self._client

        await self._reset_client()
        client = self._create_bleak_client(bleak_client_class, address, pair_on_connect=self.settings.hue_ble_auto_pair)
        self._client = client
        self._client_address = address
        self._paired_once = False

        try:
            await client.connect()
            if self.settings.hue_ble_auto_pair:
                await self._try_pair_before_write(client, pairing_errors)
                self._paired_once = True
        except Exception:
            await self._reset_client()
            raise
        return client

    async def _reset_client(self) -> None:
        client = self._client
        self._client = None
        self._client_address = None
        self._paired_once = False
        if client is not None:
            await self._disconnect_client(client)

    async def _apply_write_cooldown(self) -> None:
        if self._last_write_finished_at <= 0:
            return
        elapsed = asyncio.get_running_loop().time() - self._last_write_finished_at
        remaining = BLE_WRITE_COOLDOWN_SECONDS - elapsed
        if remaining > 0:
            await asyncio.sleep(remaining)

    def _retry_delay(self, attempt: int, exc: Exception) -> float:
        if self._is_windows_cancel_error(exc) or self._is_auth_error(exc):
            return BLE_RECONNECT_DELAY_SECONDS + (0.2 * attempt)
        return BLE_RECONNECT_DELAY_SECONDS

    async def _write_with_client(
        self,
        bleak_client_class,
        address: str,
        writes: list[tuple[str, bytes]],
        pair_on_connect: bool,
        pairing_errors: list[str],
    ) -> None:
        client = self._create_bleak_client(bleak_client_class, address, pair_on_connect)
        try:
            await client.connect()
            if pair_on_connect:
                await self._try_pair_before_write(client, pairing_errors)
            for uuid, data in writes:
                await client.write_gatt_char(uuid, data, response=True)
        finally:
            await self._disconnect_client(client)

    def _create_bleak_client(self, bleak_client_class, address: str, pair_on_connect: bool):
        if pair_on_connect:
            try:
                return bleak_client_class(address, pair=True, timeout=BLE_CONNECT_TIMEOUT)
            except TypeError as exc:
                if "pair" not in str(exc).lower():
                    raise
                logger.info("BleakClient does not accept pair=True; using explicit client.pair() only.")
        return bleak_client_class(address, timeout=BLE_CONNECT_TIMEOUT)

    async def _try_pair_before_write(self, client, pairing_errors: list[str]) -> None:
        pair = getattr(client, "pair", None)
        if not callable(pair):
            logger.info("BleakClient.pair() is not available; continuing with GATT write.")
            return
        try:
            paired = await asyncio.wait_for(self._maybe_await(pair()), timeout=BLE_PAIR_TIMEOUT)
        except NotImplementedError:
            logger.info("BleakClient.pair() is not implemented on this platform; continuing with GATT write.")
            return
        except Exception as exc:
            if self._is_pair_unsupported_error(exc):
                logger.info("BleakClient.pair() is unsupported here: %s", self._exception_chain(exc))
                return
            message = self._exception_chain(exc)
            pairing_errors.append(message)
            logger.warning("Hue BLE pairing attempt failed before write: %s", message)
            return
        if paired is False:
            pairing_errors.append("BleakClient.pair() returned False.")
            logger.warning("Hue BLE pairing attempt returned False before write.")

    async def _disconnect_client(self, client) -> None:
        try:
            if await self._is_client_connected(client):
                await client.disconnect()
        except Exception as exc:
            logger.warning("Hue BLE disconnect failed while cleaning up: %s", self._exception_chain(exc))

    async def _is_client_connected(self, client) -> bool:
        is_connected = getattr(client, "is_connected", False)
        if callable(is_connected):
            is_connected = is_connected()
        if inspect.isawaitable(is_connected):
            is_connected = await is_connected
        return bool(is_connected)

    def _raise_write_failure(
        self,
        exc: Exception,
        pairing_errors: list[str],
        fallback_used: bool = False,
    ) -> None:
        chain = self._exception_chain(exc)
        pairing_note = ""
        if pairing_errors:
            pairing_note = f" Pairing attempts: {' | '.join(pairing_errors)}"

        if self._is_auth_error(exc):
            failure = "pairing_failed" if pairing_errors or self._is_pairing_failure_error(exc) else "auth_failed"
            retry_note = " after pairing retry" if fallback_used else ""
            raise BluetoothAuthorizationError(
                f"Bluetooth authentication failed{retry_note}: {chain}{pairing_note}",
                BLUETOOTH_FIXES,
                failure=failure,
            ) from exc

        retry_note = " after pairing retry" if fallback_used else ""
        raise BackendError(
            f"Bluetooth write failed{retry_note}: {chain}{pairing_note}",
            BLUETOOTH_FIXES,
            failure="write_failed",
        ) from exc

    def _require_hue_ble_address(self) -> str:
        if not self.settings.hue_ble_address:
            raise BackendConfigurationError(
                "HueBLE backend needs HUE_BLE_ADDRESS.",
                ["/api/v1/light/scan으로 전구 주소를 찾은 뒤 .env에 HUE_BLE_ADDRESS를 설정하세요."],
            )
        return self.settings.hue_ble_address

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

    def _hex_to_rgb(self, hex_color: str) -> tuple[int, int, int]:
        value = hex_color.strip().lstrip("#")
        if len(value) != 6:
            raise BackendConfigurationError(
                f"Invalid HueBLE color value: {hex_color}",
                ["HueBLE deep color palette hex 값을 확인하세요."],
            )
        return (
            int(value[0:2], 16),
            int(value[2:4], 16),
            int(value[4:6], 16),
        )

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

        pairing_errors: list[str] = []
        client = self._create_bleak_client(BleakClient, self._require_hue_ble_address(), pair_on_connect=True)
        try:
            await client.connect()
            await self._try_pair_before_write(client, pairing_errors)
        except Exception as exc:
            if self._is_auth_error(exc):
                raise BluetoothAuthorizationError(self._exception_chain(exc), BLUETOOTH_FIXES) from exc
            raise BackendError(
                f"Windows Bluetooth pairing failed: {self._exception_chain(exc)}",
                BLUETOOTH_FIXES,
                failure="pairing_failed",
            ) from exc
        finally:
            await self._disconnect_client(client)
        if pairing_errors:
            raise BackendError(
                f"Windows Bluetooth pairing failed: {' | '.join(pairing_errors)}",
                BLUETOOTH_FIXES,
                failure="pairing_failed",
            )

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

    def _is_insufficient_auth_error(self, exc: Exception) -> bool:
        text = self._exception_chain(exc).lower()
        return (
            "insufficient authentication" in text
            or "protocol error 0x05" in text
            or ("0x05" in text and "auth" in text)
        )

    def _is_pair_unsupported_error(self, exc: Exception) -> bool:
        text = self._exception_chain(exc).lower()
        return any(
            token in text
            for token in (
                "not implemented",
                "not supported",
                "unsupported",
                "pairing is not available",
                "no attribute",
            )
        )

    def _is_pairing_failure_error(self, exc: Exception) -> bool:
        text = self._exception_chain(exc).lower()
        return any(
            token in text
            for token in (
                "pair",
                "winerror -2147023673",
                "user canceled",
                "user cancelled",
                "operation was canceled",
                "operation was cancelled",
                "사용자가 작업을 취소",
            )
        )

    def _is_windows_cancel_error(self, exc: Exception) -> bool:
        text = self._exception_chain(exc).lower()
        return any(
            token in text
            for token in (
                "winerror -2147023673",
                "operation was canceled",
                "operation was cancelled",
                "user canceled",
                "user cancelled",
                "사용자가 작업을 취소",
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

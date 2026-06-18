from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    mother_together_api_key: str | None
    light_backend: str
    ha_url: str | None
    ha_token: str | None
    ha_entity_id: str | None
    hue_ble_address: str | None
    ble_scan_timeout: float
    hue_ble_auto_pair: bool

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            mother_together_api_key=_empty_to_none(os.getenv("MOTHER_TOGETHER_API_KEY")),
            light_backend=(os.getenv("LIGHT_BACKEND") or "home_assistant").strip().lower(),
            ha_url=_empty_to_none(os.getenv("HA_URL")),
            ha_token=_empty_to_none(os.getenv("HA_TOKEN")),
            ha_entity_id=_empty_to_none(os.getenv("HA_ENTITY_ID")),
            hue_ble_address=_empty_to_none(os.getenv("HUE_BLE_ADDRESS")),
            ble_scan_timeout=float(os.getenv("BLE_SCAN_TIMEOUT", "10")),
            hue_ble_auto_pair=_env_bool(os.getenv("HUE_BLE_AUTO_PAIR"), default=True),
        )


def _empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _env_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()

from __future__ import annotations

from pydantic import BaseModel, Field


class ScanDevice(BaseModel):
    name: str
    address: str
    rssi: int | None = None


class ScanResponse(BaseModel):
    success: bool = True
    backend: str
    devices: list[ScanDevice]


class LightResponse(BaseModel):
    success: bool
    action: str | None = None
    mode: str | None = None
    backend: str
    details: dict = Field(default_factory=dict)

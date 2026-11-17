from datetime import datetime
from enum import IntEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DetectionCloseCode(IntEnum):
    """WebSocket close codes the client acts on (02 §10a)."""

    SESSION_EXPIRED = 4001
    BAD_TICKET = 4401
    ORIGIN_NOT_ALLOWED = 4403
    FRAME_TOO_LARGE = 4413
    TRY_AGAIN_LATER = 1013


class DetectionTicketRead(BaseModel):
    ticket: str
    expires_at: datetime


class DetectionAuthMessage(BaseModel):
    """The first message on the socket."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["auth"]
    ticket: str = Field(min_length=1, max_length=4096)


class DetectionBox(BaseModel):
    """Corners normalized to 0–1 of the frame the client sent."""

    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)
    x2: float = Field(ge=0, le=1)
    y2: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    label: str


class DetectionMeasurement(BaseModel):
    """Horizontal width of `boxes[box_index]`, scaled by the crab's sticker when it's in view, else by the stand's
    camera distance and field of view. `fov_deg` is the field of view that scale implies (copy it to calibrate)."""

    width_mm: float = Field(gt=0)
    mm_per_px: float = Field(gt=0)
    box_index: int = Field(ge=0)
    scale_source: Literal["sticker", "stand"]
    fov_deg: float = Field(gt=0, lt=180)
    box_width_px: float = Field(ge=0)
    frame_long_px: int = Field(gt=0)
    sticker_mm: float = Field(gt=0)
    qr_side_mm: float = Field(gt=0)
    qr_side_px: float | None = Field(default=None, gt=0)
    distance_mm: float = Field(gt=0)
    offset_mm: float


class DetectionReadyMessage(BaseModel):
    type: Literal["ready"] = "ready"
    model: str
    image_size: int


class DetectionResultMessage(BaseModel):
    type: Literal["result"] = "result"
    frame_id: int = Field(ge=0)
    width: int
    height: int
    inference_ms: float
    boxes: list[DetectionBox]
    measurement: DetectionMeasurement | None = None


class DetectionErrorMessage(BaseModel):
    """Sent for one bad frame; the socket stays open."""

    type: Literal["error"] = "error"
    code: Literal["BAD_FRAME"]
    message: str

from dataclasses import dataclass
from typing import Literal


@dataclass(slots=True, frozen=True)
class RawBox:
    """One detection, corners normalized to 0–1 of the decoded frame."""

    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    label: str


@dataclass(slots=True, frozen=True)
class Measurement:
    """Horizontal width of one box in mm. `scale_source` says what set the scale; `fov_deg` is the
    field of view that scale implies at the stand's distance (a calibration reading when it's the sticker)."""

    width_mm: float
    mm_per_px: float
    box_index: int
    scale_source: Literal["sticker", "stand"]
    fov_deg: float
    # The inputs, so the page can show the whole computation
    box_width_px: float
    frame_long_px: int
    sticker_mm: float
    qr_side_mm: float
    qr_side_px: float | None
    distance_mm: float
    offset_mm: float


@dataclass(slots=True, frozen=True)
class Inference:
    width: int
    height: int
    inference_ms: float
    boxes: tuple[RawBox, ...]
    measurement: Measurement | None = None

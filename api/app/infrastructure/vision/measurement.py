import math
from dataclasses import dataclass

import cv2
import numpy as np

from .results import Measurement, RawBox

# The sticker prints its QR at this share of its width with no quiet zone (web/lib/sticker-size.ts QR_SHARE)
QR_SHARE = 0.62

# Used only on the detector's single thread, so one instance is safe to reuse
_qr_detector = cv2.QRCodeDetector()


@dataclass(slots=True, frozen=True)
class StandCamera:
    """The fixed stand: the sticker printed on each crab, and the camera's distance and field of view."""

    sticker_mm: float
    distance_mm: float
    fov_deg: float
    offset_mm: float = 0.0


def find_qr_side_px(image: np.ndarray) -> float | None:
    """Mean side of the QR in pixels, or None when no QR is in view."""
    found, points = _qr_detector.detect(image)
    if not found or points is None:
        return None
    corners = np.asarray(points, dtype=np.float32).reshape(-1, 2)
    if corners.shape != (4, 2):
        return None
    return float(np.mean([np.linalg.norm(corners[i] - corners[(i + 1) % 4]) for i in range(4)]))


def mm_per_pixel(distance_mm: float, fov_deg: float, frame_width: int, frame_height: int) -> float:
    """Scale on the plane `distance_mm` in front of a camera pointing straight down. The field of view
    is across the camera's long side, so the frame's long side is used in portrait or landscape."""
    return 2 * distance_mm * math.tan(math.radians(fov_deg) / 2) / max(frame_width, frame_height)


def fov_from_scale(scale: float, distance_mm: float, frame_width: int, frame_height: int) -> float:
    """The field of view that would give `scale` at `distance_mm`: how a sticker in view calibrates the stand."""
    return math.degrees(2 * math.atan(scale * max(frame_width, frame_height) / (2 * distance_mm)))


def measure_width(image: np.ndarray, boxes: tuple[RawBox, ...], camera: StandCamera) -> Measurement | None:
    """Horizontal width of the most confident box: crabs lie left to right under the stand.
    The sticker sits on the shell, in the same plane, so its QR is the better scale whenever it's visible."""
    if not boxes:
        return None

    height, width = image.shape[:2]
    qr_side_mm = camera.sticker_mm * QR_SHARE
    qr_side_px = find_qr_side_px(image)
    if qr_side_px:
        scale = qr_side_mm / qr_side_px
        source = "sticker"
        fov_deg = fov_from_scale(scale, camera.distance_mm, width, height)
    else:
        scale = mm_per_pixel(camera.distance_mm, camera.fov_deg, width, height)
        source = "stand"
        fov_deg = camera.fov_deg

    index = max(range(len(boxes)), key=lambda i: boxes[i].confidence)
    box = boxes[index]
    box_width_px = (box.x2 - box.x1) * width
    return Measurement(
        width_mm=max(box_width_px * scale + camera.offset_mm, 0.0),
        mm_per_px=scale,
        box_index=index,
        scale_source=source,
        fov_deg=fov_deg,
        box_width_px=box_width_px,
        frame_long_px=max(width, height),
        sticker_mm=camera.sticker_mm,
        qr_side_mm=qr_side_mm,
        qr_side_px=qr_side_px,
        distance_mm=camera.distance_mm,
        offset_mm=camera.offset_mm,
    )

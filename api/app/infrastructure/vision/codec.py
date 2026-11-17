import cv2
import numpy as np


def decode_jpeg(data: bytes) -> np.ndarray | None:
    """BGR image from JPEG bytes, or None when the bytes aren't a readable image."""
    if not data:
        return None
    return cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)

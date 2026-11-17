from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    WebSocket,
    status,
)

from app.infrastructure.vision import YoloDetector
from .services import DetectionGate, DetectionServices

RETRY_AFTER_SECONDS = "30"

detection_gate = DetectionGate()


class ReadyDetector:
    """The process's detector, or 503 while the model isn't loaded, so no ticket is issued for a dead socket."""

    def __call__(self, request: Request) -> YoloDetector:
        detector: YoloDetector | None = getattr(request.app.state, "detector", None)
        if detector is None or not detector.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Detection isn't available right now",
                headers={"Retry-After": RETRY_AFTER_SECONDS},
            )
        return detector


class HttpDetectionServices:
    def __call__(self, _: Annotated[YoloDetector, Depends(ReadyDetector())]) -> DetectionServices:
        return DetectionServices(detection_gate)


class SocketDetectionServices:
    """The socket reports a missing model with close code 1013, so it gets the detector as-is."""

    def __call__(self, websocket: WebSocket) -> DetectionServices:
        return DetectionServices(detection_gate, getattr(websocket.app.state, "detector", None))


type DetectionServicesDep = Annotated[DetectionServices, Depends(HttpDetectionServices())]
type SocketDetectionServicesDep = Annotated[DetectionServices, Depends(SocketDetectionServices())]

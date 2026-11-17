import asyncio
import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4

from fastapi import WebSocket, WebSocketDisconnect, status
from jwt import InvalidTokenError
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.core import (
    AuthUser,
    JwtManager,
    Response,
    settings,
)
from app.core.audit import AuditServices, Outcome
from app.infrastructure.vision import Inference, StandCamera, YoloDetector
from .schemas import (
    DetectionAuthMessage,
    DetectionBox,
    DetectionMeasurement,
    DetectionCloseCode,
    DetectionErrorMessage,
    DetectionReadyMessage,
    DetectionResultMessage,
    DetectionTicketRead,
)

logger = logging.getLogger(__name__)

TICKET_TYPE = "detection"
FRAME_HEADER_BYTES = 4

DETECTION_OUTCOMES = {
    "DETECTION_TICKET_ISSUED": (Outcome.SUCCESS, status.HTTP_201_CREATED),
}

STAND_CAMERA = StandCamera(
    sticker_mm=settings.detection_sticker_mm,
    distance_mm=settings.detection_camera_distance_mm,
    fov_deg=settings.detection_camera_fov_deg,
    offset_mm=settings.detection_width_offset_mm,
)

BAD_FRAME = DetectionErrorMessage(code="BAD_FRAME", message="That frame couldn't be read")


@dataclass(slots=True)
class DetectionSession:
    """What the receive and detect loops share: the newest frame."""

    frame: tuple[int, bytes] | None = None
    arrived: asyncio.Event = field(default_factory=asyncio.Event)


class DetectionGate:
    """Process-wide state for detection: spent ticket ids and the open-session count.
    It lives in memory, so the API runs as one process (01 §8)."""

    def __init__(self, max_sessions: int = settings.detection_max_sessions):
        self.max_sessions = max_sessions
        self._spent: dict[str, float] = {}
        self._sessions = 0
        self._lock = Lock()

    def spend(self, jti: str, expires_at: float) -> bool:
        """True the first time a ticket id is used."""
        now = time.time()
        with self._lock:
            self._spent = {key: expiry for key, expiry in self._spent.items() if expiry > now}
            if jti in self._spent:
                return False
            self._spent[jti] = expires_at
            return True

    @asynccontextmanager
    async def session(self) -> AsyncIterator[bool]:
        with self._lock:
            admitted = self._sessions < self.max_sessions
            if admitted:
                self._sessions += 1
        try:
            yield admitted
        finally:
            if admitted:
                with self._lock:
                    self._sessions -= 1


class DetectionServices:
    def __init__(
        self,
        gate: DetectionGate,
        detector: YoloDetector | None = None,
        jwt: JwtManager | None = None,
        audit: AuditServices | None = None,
    ):
        self.gate = gate
        self.detector = detector
        self.jwt = jwt or JwtManager()
        self.audit = audit or AuditServices(outcomes=DETECTION_OUTCOMES)

    def issue_ticket(self, actor: AuthUser) -> Response[DetectionTicketRead]:
        ticket, expires_at = self.jwt.issue_scoped_token(
            {
                "sub": str(actor.id),
                "role": actor.role.value,
                "email": actor.email,
                "jti": uuid4().hex,
                "session_exp": int(actor.expires_at.timestamp()),
            },
            TICKET_TYPE,
            timedelta(seconds=settings.detection_ticket_seconds),
        )
        return Response(
            success=True,
            message="Detection ticket issued",
            code="DETECTION_TICKET_ISSUED",
            details=DetectionTicketRead(ticket=ticket, expires_at=expires_at),
        )

    def __redeem(self, ticket: str) -> AuthUser | None:
        try:
            claims = self.jwt.decode_token(ticket)
        except InvalidTokenError:
            return None
        if claims.get("type") != TICKET_TYPE or not self.gate.spend(str(claims.get("jti")), claims["exp"]):
            return None
        try:
            return AuthUser(
                id=claims.get("sub"),
                role=claims.get("role"),
                email=claims.get("email"),
                expires_at=claims.get("session_exp"),
            )
        except ValidationError:
            return None

    async def __reject(self, websocket: WebSocket, reason: str) -> None:
        # AuditServices reads HTTP fields off a Request, which a WebSocket doesn't have
        await run_in_threadpool(
            self.audit.record,
            action="detection.ticket_rejected",
            outcome=Outcome.FAILURE,
            reason=reason,
            changes=self.audit.build_errors(("ticket", "Detection ticket rejected", reason.lower())),
        )
        await self.__close(websocket, DetectionCloseCode.BAD_TICKET, "Detection ticket rejected")

    @staticmethod
    async def __close(websocket: WebSocket, code: DetectionCloseCode, reason: str) -> None:
        try:
            await websocket.close(code=code, reason=reason)
        except RuntimeError:
            pass

    @staticmethod
    def __is_allowed_origin(websocket: WebSocket) -> bool:
        # Browsers always send Origin; a client without one is not a page that could be hijacked
        origin = websocket.headers.get("origin")
        return origin is None or origin in settings.detection_allowed_origins

    async def __authenticate(self, websocket: WebSocket) -> AuthUser | None:
        try:
            message = await asyncio.wait_for(websocket.receive(), timeout=settings.detection_auth_timeout_seconds)
        except TimeoutError:
            await self.__reject(websocket, "AUTH_TIMEOUT")
            return None

        if message["type"] == "websocket.disconnect":
            return None
        try:
            auth = DetectionAuthMessage.model_validate_json(message.get("text") or "")
        except ValidationError:
            await self.__reject(websocket, "BAD_AUTH_MESSAGE")
            return None

        user = self.__redeem(auth.ticket)
        if user is None:
            await self.__reject(websocket, "INVALID_TICKET")
        return user

    async def __receive_frames(self, websocket: WebSocket, session: DetectionSession) -> DetectionCloseCode | None:
        """Keeps only the newest frame; returns a close code, or None when the client left."""
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                return None

            data = message.get("bytes")
            if data is None:
                continue
            if len(data) > settings.detection_max_frame_bytes:
                return DetectionCloseCode.FRAME_TOO_LARGE
            if len(data) <= FRAME_HEADER_BYTES:
                await websocket.send_text(BAD_FRAME.model_dump_json())
                continue

            session.frame = (int.from_bytes(data[:FRAME_HEADER_BYTES], "big"), data[FRAME_HEADER_BYTES:])
            session.arrived.set()

    @staticmethod
    def __to_result(frame_id: int, inference: Inference) -> DetectionResultMessage:
        return DetectionResultMessage(
            frame_id=frame_id,
            width=inference.width,
            height=inference.height,
            inference_ms=inference.inference_ms,
            boxes=[
                DetectionBox(
                    x1=box.x1,
                    y1=box.y1,
                    x2=box.x2,
                    y2=box.y2,
                    confidence=box.confidence,
                    label=box.label,
                )
                for box in inference.boxes
            ],
            measurement=None if (measured := inference.measurement) is None else DetectionMeasurement(
                width_mm=measured.width_mm,
                mm_per_px=measured.mm_per_px,
                box_index=measured.box_index,
                scale_source=measured.scale_source,
                fov_deg=measured.fov_deg,
                box_width_px=measured.box_width_px,
                frame_long_px=measured.frame_long_px,
                sticker_mm=measured.sticker_mm,
                qr_side_mm=measured.qr_side_mm,
                qr_side_px=measured.qr_side_px,
                distance_mm=measured.distance_mm,
                offset_mm=measured.offset_mm,
            ),
        )

    async def __detect_frames(self, websocket: WebSocket, detector: YoloDetector, session: DetectionSession) -> None:
        while True:
            await session.arrived.wait()
            session.arrived.clear()
            if session.frame is None:
                continue
            frame_id, jpeg = session.frame
            inference = await detector.infer_jpeg(jpeg, STAND_CAMERA)
            reply = BAD_FRAME if inference is None else self.__to_result(frame_id, inference)
            await websocket.send_text(reply.model_dump_json())

    async def run_session(self, websocket: WebSocket) -> None:
        # Accept first so the client sees our close code instead of a bare handshake 403
        await websocket.accept()
        if not self.__is_allowed_origin(websocket):
            await self.__close(websocket, DetectionCloseCode.ORIGIN_NOT_ALLOWED, "Origin not allowed")
            return

        detector = self.detector
        if detector is None or not detector.is_ready:
            await self.__close(websocket, DetectionCloseCode.TRY_AGAIN_LATER, "Detection isn't available right now")
            return

        user = await self.__authenticate(websocket)
        if user is None:
            return

        async with self.gate.session() as admitted:
            if not admitted:
                await self.__close(websocket, DetectionCloseCode.TRY_AGAIN_LATER, "Too many detection sessions")
                return

            await websocket.send_text(
                DetectionReadyMessage(model=detector.name, image_size=detector.image_size).model_dump_json()
            )
            remaining = (user.expires_at - datetime.now(timezone.utc)).total_seconds()
            session = DetectionSession()
            receiving = asyncio.create_task(self.__receive_frames(websocket, session))
            detecting = asyncio.create_task(self.__detect_frames(websocket, detector, session))

            try:
                done, _ = await asyncio.wait(
                    {receiving, detecting},
                    timeout=max(remaining, 0),
                    return_when=asyncio.FIRST_COMPLETED,
                )
            finally:
                for task in (receiving, detecting):
                    task.cancel()
                outcomes = await asyncio.gather(receiving, detecting, return_exceptions=True)

            if not done:
                await self.__close(websocket, DetectionCloseCode.SESSION_EXPIRED, "Session expired")
            elif receiving in done and isinstance(code := outcomes[0], DetectionCloseCode):
                await self.__close(websocket, code, "Frame too large")
            elif error := next((o for o in outcomes if isinstance(o, Exception) and not isinstance(o, WebSocketDisconnect)), None):
                logger.warning("Detection session for %s ended: %r", user.id, error)

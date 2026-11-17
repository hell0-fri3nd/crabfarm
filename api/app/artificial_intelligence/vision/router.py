from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    status,
)

from app.core import (
    AnyRole,
    ErrorResponse,
    Response,
    get_current_user,
    settings,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from app.core.security import rate_limit
from .dependencies import DetectionServicesDep, SocketDetectionServicesDep
from .schemas import DetectionTicketRead

# Per endpoint, not on the router: the socket authenticates with a ticket, not a Bearer header
router = APIRouter(prefix="/detections", tags=["Vision"])


@router.post(
    "/tickets",
    response_model=Response[DetectionTicketRead],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(get_current_user),
        Depends(rate_limit("detection_ticket", limit=settings.detection_ticket_rate_limit)),
    ],
    openapi_extra={AUDIT_ACTION_KEY: "detection.ticket"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired access token"},
        status.HTTP_429_TOO_MANY_REQUESTS: {"model": ErrorResponse, "description": "Too many tickets from this client"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "The detection model isn't loaded"},
    },
)
def create_ticket(actor: AnyRole, services: DetectionServicesDep):
    return services.issue_ticket(actor)


@router.websocket("/ws")
async def detection_socket(websocket: WebSocket, services: SocketDetectionServicesDep) -> None:
    await services.run_session(websocket)

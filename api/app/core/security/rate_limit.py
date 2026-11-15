import math
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import (
    HTTPException,
    Request,
    status,
)

from ..config import settings


def client_ip(request: Request) -> str | None:
    """First hop of X-Forwarded-For is the original client when behind a proxy (the Next.js BFF)."""
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else None)


class RateLimit:
    """Sliding-window limit per client IP and scope, kept in this process's memory."""

    def __init__(
        self,
        scope: str,
        limit: int = settings.auth_rate_limit,
        window_seconds: int = settings.auth_rate_limit_window_seconds,
    ):
        self.scope = scope
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def __call__(self, request: Request) -> None:
        key = client_ip(request) or "unknown"
        now = time.monotonic()

        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window_seconds:
                hits.popleft()

            if len(hits) >= self.limit:
                retry_after = math.ceil(hits[0] + self.window_seconds - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Wait a minute and try again.",
                    headers={"Retry-After": str(max(retry_after, 1))},
                )
            hits.append(now)


rate_limit = RateLimit

from dataclasses import dataclass
from datetime import datetime

from sqlmodel import select

from app.core.audit import (
    ActorType,
    AuditEvents,
    AuditServices,
    Outcome,
    Severity,
)
from app.core.database import SessionFactory
from ..schemas import DeviceName


@dataclass(slots=True, frozen=True)
class DeviceAudit:
    connected: str
    disconnected: str
    label: str


DEVICE_AUDITS: dict[DeviceName, DeviceAudit] = {
    "scale": DeviceAudit("scale.connected", "scale.disconnected", "Crab scale"),
    "water_sensors": DeviceAudit("water_sensor.connected", "water_sensor.disconnected", "Water sensors"),
}


class DevicePresenceServices:
    """Audits devices connecting and disconnecting."""

    def __init__(self, audit: AuditServices | None = None, session_factory=SessionFactory):
        self.audit = audit or AuditServices(service="worker")
        self.session_factory = session_factory

    def last_known_connection(self, device: DeviceName) -> bool | None:
        """The last audited state, so a restarted worker doesn't audit the same state again."""
        actions = DEVICE_AUDITS[device]
        with self.session_factory() as db:
            action = db.exec(
                select(AuditEvents.action)
                .where(AuditEvents.action.in_((actions.connected, actions.disconnected)))
                .order_by(AuditEvents.occurred_at.desc())
                .limit(1)
            ).first()
        return None if action is None else action == actions.connected

    def record(self, device: DeviceName, is_connected: bool, last_seen_at: datetime | None) -> None:
        actions = DEVICE_AUDITS[device]
        self.audit.record(
            action=actions.connected if is_connected else actions.disconnected,
            outcome=Outcome.SUCCESS,
            severity=Severity.INFO if is_connected else Severity.WARNING,
            actor_type=ActorType.SYSTEM,
            target_type="device",
            target_label=actions.label,
            changes={"last_seen_at": last_seen_at.isoformat() if last_seen_at else None},
        )

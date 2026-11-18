import logging
from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from fastapi import Request, status
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import (
    Session,
    func,
    select,
)

from app.core import Page, Response
from app.core.audit import (
    Actor,
    AuditServices,
    Outcome,
)
from ..models import WaterSensorLogs
from ..schemas import (
    ListWaterSensorLogsQuery,
    WaterSensorLogFilters,
    WaterSensorMessage,
    WaterSensorStatusCounts,
)

logger = logging.getLogger(__name__)

VALUE_DECIMALS = 3

WATER_SENSOR_LOG_OUTCOMES = {
    "WATER_SENSOR_LOGS_LISTED":       (Outcome.SUCCESS, status.HTTP_200_OK),
    "WATER_SENSOR_COUNTS_READY":      (Outcome.SUCCESS, status.HTTP_200_OK),
    "WATER_SENSOR_LOGS_LIST_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

WATER_SENSOR_LOG_ERRORS = {
    "WATER_SENSOR_LOGS_LIST_FAILED": ("server", "Unable to list sensor logs right now"),
}


class WaterSensorLogServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=WATER_SENSOR_LOG_OUTCOMES, errors=WATER_SENSOR_LOG_ERRORS)

    @staticmethod
    def __filtered(statement, query: WaterSensorLogFilters):
        conditions = []
        if query.sensor:
            conditions.append(WaterSensorLogs.sensor.in_(query.sensor))
        if query.from_:
            conditions.append(WaterSensorLogs.measured_at >= query.from_)
        if query.to:
            conditions.append(WaterSensorLogs.measured_at < query.to)
        return statement.where(*conditions)

    def list(
        self,
        query: ListWaterSensorLogsQuery,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[Page[WaterSensorLogs]]:
        action = "water_sensor_log.list"
        status_filter = () if query.status is None else (WaterSensorLogs.status == query.status,)
        ordering = WaterSensorLogs.measured_at.asc() if query.sort == "measured_at" else WaterSensorLogs.measured_at.desc()
        try:
            total = self.db.exec(
                self.__filtered(select(func.count()).select_from(WaterSensorLogs), query).where(*status_filter)
            ).one()
            logs = self.db.exec(
                self.__filtered(select(WaterSensorLogs), query)
                .where(*status_filter)
                .order_by(ordering, WaterSensorLogs.id.desc())
                .offset(query.offset)
                .limit(query.size)
            ).all()

            self.audit.record_target(action, "WATER_SENSOR_LOGS_LISTED", request, actor, target_type="water_sensor_log")
            return Response(
                success=True,
                message="Sensor logs retrieved",
                code="WATER_SENSOR_LOGS_LISTED",
                details=Page(items=list(logs), total=total, page=query.page, size=query.size),
            )

        except Exception:
            logger.exception("Sensor log listing failed")
            self.audit.record_target(action, "WATER_SENSOR_LOGS_LIST_FAILED", request, actor, target_type="water_sensor_log")
            return Response(
                success=False,
                message=WATER_SENSOR_LOG_ERRORS["WATER_SENSOR_LOGS_LIST_FAILED"][1],
                code="WATER_SENSOR_LOGS_LIST_FAILED",
            )

    def count_by_status(self, query: WaterSensorLogFilters) -> Response[WaterSensorStatusCounts]:
        """How many logs match per status. Not audited: every Sensor logs view reads it."""
        try:
            rows: Sequence = self.db.exec(
                self.__filtered(select(WaterSensorLogs.status, func.count()), query).group_by(WaterSensorLogs.status)
            ).all()
            counts = WaterSensorStatusCounts(**{sensor_status.value: count for sensor_status, count in rows})
            return Response(success=True, message="Sensor log counts ready", code="WATER_SENSOR_COUNTS_READY", details=counts)

        except Exception:
            logger.exception("Sensor log counting failed")
            return Response(
                success=False,
                message=WATER_SENSOR_LOG_ERRORS["WATER_SENSOR_LOGS_LIST_FAILED"][1],
                code="WATER_SENSOR_LOGS_LIST_FAILED",
            )

    def save_snapshot(self, message: WaterSensorMessage, measured_at: datetime, slot_at: datetime) -> int:
        """Saves one reading per sensor for this slot and returns how many rows were new."""
        statuses = message.statuses
        rows = [
            {
                "sensor": sensor,
                "value": Decimal(str(round(value, VALUE_DECIMALS))),
                "status": statuses[sensor],
                "measured_at": measured_at,
                "slot_at": slot_at,
            }
            for sensor, value in message.readings.items()
        ]
        saved_ids = self.db.exec(
            insert(WaterSensorLogs)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["sensor", "slot_at"])
            .returning(WaterSensorLogs.id)
        ).all()
        self.db.commit()
        return len(saved_ids)

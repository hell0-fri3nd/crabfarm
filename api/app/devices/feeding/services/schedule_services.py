import logging
from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Request, status
from sqlmodel import (
    Session,
    col,
    func,
    select,
)

from app.core import (
    Page,
    Response,
    Role,
)
from app.core.audit import (
    Actor,
    AuditServices,
    Outcome,
)
from ..models import (
    Cages,
    ScheduleGroups,
    Schedules,
)
from ..schemas import (
    CreateScheduleRequest,
    ListSchedulesQuery,
    ScheduleRead,
    UpdateScheduleRequest,
)

logger = logging.getLogger(__name__)


SCHEDULE_OUTCOMES = {
    "SCHEDULES_LISTED":         (Outcome.SUCCESS, status.HTTP_200_OK),
    "SCHEDULE_CREATED":         (Outcome.SUCCESS, status.HTTP_201_CREATED),
    "SCHEDULE_UPDATED":         (Outcome.SUCCESS, status.HTTP_200_OK),
    "SCHEDULE_DELETED":         (Outcome.SUCCESS, status.HTTP_200_OK),
    "SCHEDULE_RESTORED":        (Outcome.SUCCESS, status.HTTP_200_OK),
    "SCHEDULE_EDIT_FORBIDDEN":  (Outcome.DENIED,  status.HTTP_403_FORBIDDEN),
    "SCHEDULE_NOT_FOUND":       (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "SCHEDULE_GROUP_NOT_FOUND": (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "SCHEDULES_LIST_FAILED":   (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "SCHEDULE_CREATE_FAILED":   (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "SCHEDULE_UPDATE_FAILED":   (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "SCHEDULE_DELETE_FAILED":   (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "SCHEDULE_RESTORE_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

SCHEDULE_MANAGER_ROLES = (Role.DEVELOPER, Role.ADMIN)

SCHEDULE_ERRORS = {
    "SCHEDULE_EDIT_FORBIDDEN":  ("body", "Only admins and developers can edit a schedule's details"),
    "SCHEDULE_NOT_FOUND":      ("path.schedule_id", "Schedule not found"),
    "SCHEDULE_GROUP_NOT_FOUND": ("group_codes", "One or more groups have no cages"),
    "SCHEDULES_LIST_FAILED":    ("server", "Unable to load the schedules right now"),
    "SCHEDULE_CREATE_FAILED":   ("server", "Unable to create the schedule right now"),
    "SCHEDULE_UPDATE_FAILED":   ("server", "Unable to update the schedule right now"),
    "SCHEDULE_DELETE_FAILED":   ("server", "Unable to delete the schedule right now"),
    "SCHEDULE_RESTORE_FAILED":  ("server", "Unable to restore the schedule right now"),
}


class ScheduleServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=SCHEDULE_OUTCOMES, errors=SCHEDULE_ERRORS)

    def __fail(
        self,
        action: str,
        code: str,
        actor: Actor,
        request: Request | None,
        message: str | None = None,
    ) -> Response:
        field, default_message = SCHEDULE_ERRORS[code]
        message = message or default_message
        self.audit.record_target(
            action,
            code,
            request,
            actor,
            target_type="schedule",
            changes=AuditServices.build_errors((field, message, code.lower())),
        )
        return Response(success=False, message=message, code=code)

    def __missing_groups(self, group_codes: list[str]) -> list[str]:
        query = select(Cages.group_code).where(col(Cages.group_code).in_(group_codes)).distinct()
        return sorted(set(group_codes) - set(self.db.exec(query).all()))

    def __group_codes_by_schedule(self, schedule_ids: list[UUID]) -> dict[UUID, list[str]]:
        query = (
            select(ScheduleGroups)
            .where(col(ScheduleGroups.schedule_id).in_(schedule_ids))
            .order_by(col(ScheduleGroups.group_code))
        )
        group_codes: defaultdict[UUID, list[str]] = defaultdict(list)
        for row in self.db.exec(query).all():
            group_codes[row.schedule_id].append(row.group_code)
        return group_codes

    def __find_current(self, schedule_id: UUID) -> Schedules | None:
        schedule = self.db.get(Schedules, schedule_id)
        return schedule if schedule and schedule.deleted_at is None else None

    def __replace_groups(self, schedule: Schedules, group_codes: list[str]) -> None:
        current = self.db.exec(select(ScheduleGroups).where(ScheduleGroups.schedule_id == schedule.id)).all()
        current_codes = {row.group_code for row in current}
        for row in current:
            if row.group_code not in group_codes:
                self.db.delete(row)
        self.db.add_all(
            ScheduleGroups.model_validate({"schedule_id": schedule.id, "group_code": group_code})
            for group_code in group_codes
            if group_code not in current_codes
        )
        # The groups live in another table, so the schedule row wouldn't change on its own
        schedule.updated_at = datetime.now(timezone.utc)

    @staticmethod
    def __update_message(schedule: Schedules, is_toggle_only: bool) -> str:
        if not is_toggle_only:
            return "Schedule updated"
        return "Schedule turned on" if schedule.is_enabled else "Schedule turned off"

    def __to_read(self, schedule: Schedules) -> ScheduleRead:
        group_codes = self.__group_codes_by_schedule([schedule.id])[schedule.id]
        return ScheduleRead.model_validate({**schedule.model_dump(), "group_codes": group_codes})

    def __record_success(
        self,
        action: str,
        code: str,
        schedule: Schedules,
        actor: Actor,
        request: Request | None,
        changes: dict,
    ) -> None:
        self.audit.record_target(
            action,
            code,
            request,
            actor,
            target_type="schedule",
            target=schedule,
            target_label=schedule.name,
            changes=changes,
        )

    def list(
        self,
        query: ListSchedulesQuery,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[Page[ScheduleRead]]:
        action = "schedule.list"
        try:
            is_current = col(Schedules.deleted_at).is_(None)
            total = self.db.exec(select(func.count()).select_from(Schedules).where(is_current)).one()
            schedules = self.db.exec(
                select(Schedules)
                .where(is_current)
                .order_by(col(Schedules.feed_time), col(Schedules.created_at))
                .offset(query.offset)
                .limit(query.size)
            ).all()
            group_codes = self.__group_codes_by_schedule([schedule.id for schedule in schedules])
            items = [
                ScheduleRead.model_validate({**schedule.model_dump(), "group_codes": group_codes[schedule.id]})
                for schedule in schedules
            ]

            self.audit.record_target(action, "SCHEDULES_LISTED", request, actor, target_type="schedule")
            return Response(
                success=True,
                message="Schedules retrieved",
                code="SCHEDULES_LISTED",
                details=Page(items=items, total=total, page=query.page, size=query.size),
            )

        except Exception:
            logger.exception("Schedule listing failed")
            return self.__fail(action, "SCHEDULES_LIST_FAILED", actor, request)

    def create(
        self,
        payload: CreateScheduleRequest,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[ScheduleRead]:
        action = "schedule.create"
        try:
            if missing := self.__missing_groups(payload.group_codes):
                message = f"No cages in group {', '.join(missing)}"
                return self.__fail(action, "SCHEDULE_GROUP_NOT_FOUND", actor, request, message)

            schedule = Schedules.model_validate({**payload.model_dump(exclude={"group_codes"}), "user_id": actor.id})
            self.db.add(schedule)
            self.db.flush()
            self.db.add_all(
                ScheduleGroups.model_validate({"schedule_id": schedule.id, "group_code": group_code})
                for group_code in payload.group_codes
            )
            self.db.commit()
            self.db.refresh(schedule)

            details = ScheduleRead.model_validate({**schedule.model_dump(), "group_codes": payload.group_codes})
            self.audit.record_target(
                action,
                "SCHEDULE_CREATED",
                request,
                actor,
                target_type="schedule",
                target=schedule,
                target_label=schedule.name,
                changes={"after": details.model_dump(mode="json")},
            )
            return Response(success=True, message="Schedule created", code="SCHEDULE_CREATED", details=details)

        except Exception:
            self.db.rollback()
            logger.exception("Schedule creation failed")
            return self.__fail(action, "SCHEDULE_CREATE_FAILED", actor, request)

    def update(
        self,
        schedule_id: UUID,
        payload: UpdateScheduleRequest,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[ScheduleRead]:
        action = "schedule.update"
        try:
            requested = payload.model_dump(exclude_unset=True)
            group_codes = requested.get("group_codes")
            schedule_fields = {field: value for field, value in requested.items() if field != "group_codes"}
            is_toggle_only = set(requested) == {"is_enabled"}

            # The allowed role depends on which fields were sent, so the router can't decide (01 §13)
            if not is_toggle_only and actor.role not in SCHEDULE_MANAGER_ROLES:
                return self.__fail(action, "SCHEDULE_EDIT_FORBIDDEN", actor, request)
            if not (schedule := self.__find_current(schedule_id)):
                return self.__fail(action, "SCHEDULE_NOT_FOUND", actor, request)
            if group_codes and (missing := self.__missing_groups(group_codes)):
                message = f"No cages in group {', '.join(missing)}"
                return self.__fail(action, "SCHEDULE_GROUP_NOT_FOUND", actor, request, message)

            before = self.__to_read(schedule).model_dump(mode="json")
            for field, value in schedule_fields.items():
                setattr(schedule, field, value)
            if group_codes:
                self.__replace_groups(schedule, group_codes)
            self.db.commit()
            self.db.refresh(schedule)

            details = self.__to_read(schedule)
            after = details.model_dump(mode="json")
            changes = {
                "before": {field: before[field] for field in requested},
                "after": {field: after[field] for field in requested},
            }
            self.__record_success(action, "SCHEDULE_UPDATED", schedule, actor, request, changes)
            return Response(
                success=True,
                message=self.__update_message(schedule, is_toggle_only),
                code="SCHEDULE_UPDATED",
                details=details,
            )

        except Exception:
            self.db.rollback()
            logger.exception("Schedule update failed")
            return self.__fail(action, "SCHEDULE_UPDATE_FAILED", actor, request)

    def delete(self, schedule_id: UUID, actor: Actor, request: Request | None = None) -> Response[None]:
        action = "schedule.delete"
        try:
            if not (schedule := self.__find_current(schedule_id)):
                return self.__fail(action, "SCHEDULE_NOT_FOUND", actor, request)

            changes = {"before": self.__to_read(schedule).model_dump(mode="json")}
            schedule.deleted_at = datetime.now(timezone.utc)
            self.db.commit()

            self.__record_success(action, "SCHEDULE_DELETED", schedule, actor, request, changes)
            return Response(success=True, message="Schedule deleted", code="SCHEDULE_DELETED")

        except Exception:
            self.db.rollback()
            logger.exception("Schedule deletion failed")
            return self.__fail(action, "SCHEDULE_DELETE_FAILED", actor, request)

    def restore(self, schedule_id: UUID, actor: Actor, request: Request | None = None) -> Response[ScheduleRead]:
        action = "schedule.restore"
        try:
            if not (schedule := self.db.get(Schedules, schedule_id)):
                return self.__fail(action, "SCHEDULE_NOT_FOUND", actor, request)

            schedule.deleted_at = None
            self.db.commit()
            self.db.refresh(schedule)

            details = self.__to_read(schedule)
            self.__record_success(
                action,
                "SCHEDULE_RESTORED",
                schedule,
                actor,
                request,
                {"after": details.model_dump(mode="json")},
            )
            return Response(success=True, message="Schedule restored", code="SCHEDULE_RESTORED", details=details)

        except Exception:
            self.db.rollback()
            logger.exception("Schedule restore failed")
            return self.__fail(action, "SCHEDULE_RESTORE_FAILED", actor, request)

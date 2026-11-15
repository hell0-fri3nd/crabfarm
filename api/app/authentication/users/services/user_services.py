import logging
from uuid import UUID

from fastapi import Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import (
    Session,
    func,
    select,
)

from app.core import (
    Page,
    Permission,
    Role,
    has_permission,
    settings,
)
from .audit_services import AuditServices
from .password_services import PasswordServices
from .session_services import SessionServices
from ..models import SessionRevokedReason, Users
from ..schemas import (
    CreateUserRequest,
    ListUsersQuery,
    Response,
    UpdateUserRequest,
    UserRead,
)

logger = logging.getLogger(__name__)

SORT_COLUMNS = {
    "name": Users.name,
    "email": Users.email,
    "created_at": Users.created_at,
}

FAILURE_MESSAGES = {
    "USER_NOT_FOUND": "User not found",
    "EMAIL_ALREADY_EXISTS": "Email already exists",
    "ADMIN_ROLE_REQUIRED": "Only an admin can manage admin accounts",
    "CANNOT_DEACTIVATE_SELF": "You cannot deactivate your own account",
    "CANNOT_RESET_OWN_CREDENTIALS": "Use change-password and change-pin for your own account",
    "USER_CREATE_FAILED": "Unable to create user right now",
    "USERS_LIST_FAILED": "Unable to list users right now",
    "USER_GET_FAILED": "Unable to retrieve user right now",
    "USER_UPDATE_FAILED": "Unable to update user right now",
    "USER_DEACTIVATE_FAILED": "Unable to deactivate user right now",
    "CREDENTIALS_RESET_FAILED": "Unable to reset credentials right now",
}


class UserServices:
    def __init__(
        self,
        db: Session,
        password_services: PasswordServices | None = None,
        audit: AuditServices | None = None,
    ):
        self.db = db
        self.password_services = password_services or PasswordServices()
        self.audit = audit or AuditServices()
        self.sessions = SessionServices(db)

    def __fail(
        self,
        action: str,
        code: str,
        actor: Users,
        request: Request | None,
        target: Users | None = None,
    ) -> Response:
        self.audit.user(action, request, code, actor=actor, target=target)
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    @staticmethod
    def __requires_admin(actor: Users, *roles: Role | None) -> bool:
        # The target/assigned role is only known from the payload or the DB, so this can't be a route dependency
        return Role.ADMIN in roles and not has_permission(actor.role, Permission.USER_MANAGE_ADMINS)

    def __default_credentials(self) -> dict:
        return {
            "password": self.password_services.hash_password(settings.default_user_password),
            "pin": self.password_services.hash_password(settings.default_user_pin),
            "has_default_credentials": True,
        }

    def __email_taken(self, email: str, exclude_id: UUID | None = None) -> bool:
        statement = select(Users.id).where(Users.email == email)
        if exclude_id:
            statement = statement.where(Users.id != exclude_id)
        return self.db.exec(statement).first() is not None

    def create(self, payload: CreateUserRequest, actor: Users, request: Request | None = None) -> Response[UserRead]:
        action = "user.create"
        try:
            if self.__requires_admin(actor, payload.role):
                return self.__fail(action, "ADMIN_ROLE_REQUIRED", actor, request)
            if self.__email_taken(payload.email):
                return self.__fail(action, "EMAIL_ALREADY_EXISTS", actor, request)

            user = Users(**payload.model_dump(), **self.__default_credentials())
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            created = UserRead.model_validate(user)
            self.audit.user(
                action, request, "USER_CREATED", actor=actor, target=user,
                changes={"after": created.model_dump(mode="json")},
            )
            return Response(success=True, message="User created", code="USER_CREATED", details=created)

        except IntegrityError:
            self.db.rollback()
            return self.__fail(action, "EMAIL_ALREADY_EXISTS", actor, request)
        except Exception:
            self.db.rollback()
            logger.exception("User creation failed")
            return self.__fail(action, "USER_CREATE_FAILED", actor, request)

    def list(self, query: ListUsersQuery, actor: Users, request: Request | None = None) -> Response[Page[UserRead]]:
        action = "user.list"
        try:
            statement = select(Users)
            if query.q:
                statement = statement.where(
                    Users.name.icontains(query.q, autoescape=True)
                    | Users.email.icontains(query.q, autoescape=True)
                )
            if query.role:
                statement = statement.where(Users.role == query.role)
            if query.is_active is not None:
                statement = statement.where(Users.is_active == query.is_active)

            total = self.db.exec(select(func.count()).select_from(statement.subquery())).one()

            column = SORT_COLUMNS[query.sort.removeprefix("-")]
            users = self.db.exec(
                statement
                .order_by(column.desc() if query.sort.startswith("-") else column.asc())
                .offset(query.offset)
                .limit(query.size)
            ).all()

            page = Page[UserRead](
                items=[UserRead.model_validate(u) for u in users],
                total=total,
                page=query.page,
                size=query.size,
            )
            self.audit.user(action, request, "USERS_LISTED", actor=actor)
            return Response(success=True, message="Users retrieved", code="USERS_LISTED", details=page)

        except Exception:
            logger.exception("User listing failed")
            return self.__fail(action, "USERS_LIST_FAILED", actor, request)

    def get(self, user_id: UUID, actor: Users, request: Request | None = None) -> Response[UserRead]:
        action = "user.get"
        try:
            if not (user := self.db.get(Users, user_id)):
                return self.__fail(action, "USER_NOT_FOUND", actor, request)

            self.audit.user(action, request, "USER_FOUND", actor=actor, target=user)
            return Response(
                success=True, message="User retrieved", code="USER_FOUND",
                details=UserRead.model_validate(user),
            )

        except Exception:
            logger.exception("User lookup failed for %s", user_id)
            return self.__fail(action, "USER_GET_FAILED", actor, request)

    def update(
        self,
        user_id: UUID,
        payload: UpdateUserRequest,
        actor: Users,
        request: Request | None = None,
    ) -> Response[UserRead]:
        action = "user.update"
        try:
            if not (user := self.db.get(Users, user_id)):
                return self.__fail(action, "USER_NOT_FOUND", actor, request)
            if self.__requires_admin(actor, user.role, payload.role):
                return self.__fail(action, "ADMIN_ROLE_REQUIRED", actor, request, target=user)
            if payload.email and self.__email_taken(payload.email, exclude_id=user.id):
                return self.__fail(action, "EMAIL_ALREADY_EXISTS", actor, request, target=user)

            updates = payload.model_dump(exclude_unset=True, exclude_none=True)
            before = UserRead.model_validate(user).model_dump(mode="json", include=set(updates))
            for field, value in updates.items():
                setattr(user, field, value)

            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            updated = UserRead.model_validate(user)
            self.audit.user(
                action, request, "USER_UPDATED", actor=actor, target=user,
                changes={"before": before, "after": updated.model_dump(mode="json", include=set(updates))},
            )
            return Response(success=True, message="User updated", code="USER_UPDATED", details=updated)

        except IntegrityError:
            self.db.rollback()
            return self.__fail(action, "EMAIL_ALREADY_EXISTS", actor, request)
        except Exception:
            self.db.rollback()
            logger.exception("User update failed for %s", user_id)
            return self.__fail(action, "USER_UPDATE_FAILED", actor, request)

    def deactivate(self, user_id: UUID, actor: Users, request: Request | None = None) -> Response[UserRead]:
        action = "user.deactivate"
        try:
            if user_id == actor.id:
                return self.__fail(action, "CANNOT_DEACTIVATE_SELF", actor, request, target=actor)
            if not (user := self.db.get(Users, user_id)):
                return self.__fail(action, "USER_NOT_FOUND", actor, request)
            if self.__requires_admin(actor, user.role):
                return self.__fail(action, "ADMIN_ROLE_REQUIRED", actor, request, target=user)

            was_active = user.is_active
            user.is_active = False
            self.db.add(user)
            revoked = self.sessions.revoke_all(user.id, SessionRevokedReason.DEACTIVATED)
            self.db.commit()
            self.db.refresh(user)

            self.audit.user(
                action, request, "USER_DEACTIVATED", actor=actor, target=user,
                changes={
                    "before": {"is_active": was_active},
                    "after": {"is_active": False, "sessions_revoked": revoked},
                },
            )
            return Response(
                success=True, message="User deactivated", code="USER_DEACTIVATED",
                details=UserRead.model_validate(user),
            )

        except Exception:
            self.db.rollback()
            logger.exception("User deactivation failed for %s", user_id)
            return self.__fail(action, "USER_DEACTIVATE_FAILED", actor, request)

    def reset_credentials(self, user_id: UUID, actor: Users, request: Request | None = None) -> Response[UserRead]:
        action = "user.reset_credentials"
        try:
            if user_id == actor.id:
                return self.__fail(action, "CANNOT_RESET_OWN_CREDENTIALS", actor, request, target=actor)
            if not (user := self.db.get(Users, user_id)):
                return self.__fail(action, "USER_NOT_FOUND", actor, request)
            if self.__requires_admin(actor, user.role):
                return self.__fail(action, "ADMIN_ROLE_REQUIRED", actor, request, target=user)

            for field, value in self.__default_credentials().items():
                setattr(user, field, value)
            self.db.add(user)
            revoked = self.sessions.revoke_all(user.id, SessionRevokedReason.CREDENTIALS_RESET)
            self.db.commit()
            self.db.refresh(user)

            self.audit.user(
                action, request, "CREDENTIALS_RESET", actor=actor, target=user,
                changes={"after": {"has_default_credentials": True, "sessions_revoked": revoked}},
            )
            return Response(
                success=True, message="Password and pin reset to the defaults", code="CREDENTIALS_RESET",
                details=UserRead.model_validate(user),
            )

        except Exception:
            self.db.rollback()
            logger.exception("Credentials reset failed for %s", user_id)
            return self.__fail(action, "CREDENTIALS_RESET_FAILED", actor, request)

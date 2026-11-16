"""rename roles to developer, admin, staff

Revision ID: f3b8a1d6c2e9
Revises: c7d18e5a02f4
Create Date: 2026-11-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f3b8a1d6c2e9'
down_revision: Union[str, Sequence[str], None] = 'c7d18e5a02f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 'ADMIN' must be freed before 'USER' can take its name
    op.execute("ALTER TYPE role RENAME VALUE 'ADMIN' TO 'DEVELOPER'")
    op.execute("ALTER TYPE role RENAME VALUE 'USER' TO 'ADMIN'")
    op.execute("ALTER TABLE auth.users ALTER COLUMN role SET DEFAULT 'STAFF'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE auth.users ALTER COLUMN role SET DEFAULT 'USER'")
    op.execute("ALTER TYPE role RENAME VALUE 'ADMIN' TO 'USER'")
    op.execute("ALTER TYPE role RENAME VALUE 'DEVELOPER' TO 'ADMIN'")

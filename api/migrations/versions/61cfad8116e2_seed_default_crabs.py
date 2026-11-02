"""seed default crabs

Revision ID: 61cfad8116e2
Revises: 538a8836284b
Create Date: 2026-11-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61cfad8116e2'
down_revision: Union[str, Sequence[str], None] = '538a8836284b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GROUPS = 'ABCDE'
CRABS_PER_GROUP = 5


def default_crabs() -> list[dict]:
    return [
        {'name': f'{group}{number}', 'group_by': group}
        for group in GROUPS
        for number in range(1, CRABS_PER_GROUP + 1)
    ]


def upgrade() -> None:
    """Upgrade schema."""
    op.get_bind().execute(
        sa.text(
            """
            INSERT INTO crab_management.crabs (name, group_by)
            VALUES (:name, :group_by)
            ON CONFLICT (name) DO NOTHING
            """
        ),
        default_crabs(),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.get_bind().execute(
        sa.text('DELETE FROM crab_management.crabs WHERE name = :name'),
        [{'name': crab['name']} for crab in default_crabs()],
    )

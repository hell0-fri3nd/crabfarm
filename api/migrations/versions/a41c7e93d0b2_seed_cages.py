"""seed cages

Revision ID: a41c7e93d0b2
Revises: 8d2f4b6a1e37
Create Date: 2026-11-18 22:05:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a41c7e93d0b2'
down_revision: Union[str, Sequence[str], None] = '8d2f4b6a1e37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        INSERT INTO devices.cages (id, crab_id)
        SELECT gen_random_uuid(), id FROM crab_management.crabs
        ON CONFLICT (crab_id) DO NOTHING
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DELETE FROM devices.cages')

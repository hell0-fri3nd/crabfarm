"""add is_active to users

Revision ID: 3f1a9c2b7d40
Revises: dc241ffb67c8
Create Date: 2026-11-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f1a9c2b7d40'
down_revision: Union[str, Sequence[str], None] = 'dc241ffb67c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        schema='auth',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_active', schema='auth')

"""add has_default_credentials to users

Revision ID: 7b2e4d91c0a5
Revises: 3f1a9c2b7d40
Create Date: 2026-11-08 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b2e4d91c0a5'
down_revision: Union[str, Sequence[str], None] = '3f1a9c2b7d40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Existing users chose their own credentials, so they start as already onboarded
    op.add_column(
        'users',
        sa.Column('has_default_credentials', sa.Boolean(), server_default=sa.false(), nullable=False),
        schema='auth',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'has_default_credentials', schema='auth')

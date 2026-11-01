"""edit role name from UserRole to role only

Revision ID: b0dd3576d619
Revises: 2e729c887cad
Create Date: 2026-11-01 22:24:25.851912

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b0dd3576d619'
down_revision: Union[str, Sequence[str], None] = '2e729c887cad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('ALTER TYPE userrole RENAME TO role')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('ALTER TYPE role RENAME TO userrole')

"""drop feeders device code

Revision ID: 3c9e7a1d5f20
Revises: fbeb829dd925
Create Date: 2026-11-18 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c9e7a1d5f20'
down_revision: Union[str, Sequence[str], None] = 'fbeb829dd925'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'devices'
TABLE = 'feeders'
CONSTRAINT = 'uq_feeders_device_code'


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(CONSTRAINT, TABLE, schema=SCHEMA, type_='unique')
    op.drop_column(TABLE, 'device_code', schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(TABLE, sa.Column('device_code', sa.String(length=64), nullable=True), schema=SCHEMA)
    # The dropped codes are gone, so existing feeders get a unique placeholder
    op.execute(f'UPDATE {SCHEMA}.{TABLE} SET device_code = id::text')
    op.alter_column(TABLE, 'device_code', nullable=False, schema=SCHEMA)
    op.create_unique_constraint(CONSTRAINT, TABLE, ['device_code'], schema=SCHEMA)

"""create water sensor logs

Revision ID: b6e41f7a2c90
Revises: 5a7d3e9c1b42
Create Date: 2026-11-18 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6e41f7a2c90'
down_revision: Union[str, Sequence[str], None] = '5a7d3e9c1b42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'devices'
TABLE = 'water_sensor_logs'


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(f'CREATE SCHEMA IF NOT EXISTS {SCHEMA}')
    op.create_table(
        TABLE,
        sa.Column('id', sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column(
            'sensor',
            sa.Enum('temperature', 'ph', 'salinity', 'ammonia', 'turbidity', 'oxygen', name='water_sensor_name', schema=SCHEMA),
            nullable=False,
        ),
        sa.Column('value', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column(
            'status',
            sa.Enum('normal', 'warning', 'danger', name='water_sensor_status', schema=SCHEMA),
            nullable=False,
        ),
        sa.Column('measured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('slot_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_water_sensor_logs'),
        sa.UniqueConstraint('sensor', 'slot_at', name='uq_water_sensor_logs_sensor'),
        schema=SCHEMA,
    )
    for column in ('sensor', 'status', 'measured_at'):
        op.create_index(f'ix_{SCHEMA}_{TABLE}_{column}', TABLE, [column], schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    for column in ('measured_at', 'status', 'sensor'):
        op.drop_index(f'ix_{SCHEMA}_{TABLE}_{column}', table_name=TABLE, schema=SCHEMA)
    op.drop_table(TABLE, schema=SCHEMA)
    op.execute(f'DROP TYPE IF EXISTS {SCHEMA}.water_sensor_status')
    op.execute(f'DROP TYPE IF EXISTS {SCHEMA}.water_sensor_name')
    op.execute(f'DROP SCHEMA IF EXISTS {SCHEMA}')

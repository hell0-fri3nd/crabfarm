"""create feeders cages and schedules

Revision ID: fbeb829dd925
Revises: b6e41f7a2c90
Create Date: 2026-11-18 20:02:51.896956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fbeb829dd925'
down_revision: Union[str, Sequence[str], None] = 'b6e41f7a2c90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'devices'
SCHEDULE_INDEXES = ('group_code', 'is_enabled', 'user_id')
CAGE_INDEXES = ('feeder_id', 'group_code', 'state')


def __timestamps() -> list[sa.Column]:
    return [
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'feeders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('device_code', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        *__timestamps(),
        sa.PrimaryKeyConstraint('id', name='pk_feeders'),
        sa.UniqueConstraint('device_code', name='uq_feeders_device_code'),
        schema=SCHEMA,
    )
    op.create_table(
        'cages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('group_code', sa.String(length=10), nullable=False),
        sa.Column('feeder_id', sa.Uuid(), nullable=True),
        sa.Column('is_scheduled', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            'state',
            sa.Enum('ok', 'jammed', 'offline', name='cage_state', schema=SCHEMA),
            server_default='ok',
            nullable=False,
        ),
        sa.Column('state_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_fed_at', sa.DateTime(timezone=True), nullable=True),
        *__timestamps(),
        sa.ForeignKeyConstraint(
            ['feeder_id'],
            [f'{SCHEMA}.feeders.id'],
            name='fk_cages_feeder_id_feeders',
            ondelete='RESTRICT',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_cages'),
        sa.UniqueConstraint('code', name='uq_cages_code'),
        schema=SCHEMA,
    )
    op.create_table(
        'schedules',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=40), nullable=False),
        sa.Column('feed_time', sa.Time(), nullable=False),
        sa.Column(
            'days',
            sa.Enum('every-day', 'weekdays', 'mon-wed-fri', 'weekends', name='schedule_days', schema=SCHEMA),
            server_default='every-day',
            nullable=False,
        ),
        sa.Column('group_code', sa.String(length=10), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        *__timestamps(),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_schedules'),
        schema=SCHEMA,
    )
    for column in CAGE_INDEXES:
        op.create_index(f'ix_{SCHEMA}_cages_{column}', 'cages', [column], schema=SCHEMA)
    for column in SCHEDULE_INDEXES:
        op.create_index(f'ix_{SCHEMA}_schedules_{column}', 'schedules', [column], schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    for column in SCHEDULE_INDEXES:
        op.drop_index(f'ix_{SCHEMA}_schedules_{column}', table_name='schedules', schema=SCHEMA)
    for column in CAGE_INDEXES:
        op.drop_index(f'ix_{SCHEMA}_cages_{column}', table_name='cages', schema=SCHEMA)
    op.drop_table('schedules', schema=SCHEMA)
    op.drop_table('cages', schema=SCHEMA)
    op.drop_table('feeders', schema=SCHEMA)
    op.execute(f'DROP TYPE IF EXISTS {SCHEMA}.schedule_days')
    op.execute(f'DROP TYPE IF EXISTS {SCHEMA}.cage_state')

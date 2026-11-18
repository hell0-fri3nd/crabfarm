"""simplify cages and drop feeders

Revision ID: 8d2f4b6a1e37
Revises: 3c9e7a1d5f20
Create Date: 2026-11-18 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d2f4b6a1e37'
down_revision: Union[str, Sequence[str], None] = '3c9e7a1d5f20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'devices'
OLD_CAGE_INDEXES = ('feeder_id', 'group_code', 'state')


def __timestamps() -> list[sa.Column]:
    return [
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(f"ALTER TYPE {SCHEMA}.schedule_days RENAME VALUE 'mon-wed-fri' TO 'mon-wed-fri-sun'")
    op.drop_table('cages', schema=SCHEMA)
    op.drop_table('feeders', schema=SCHEMA)
    op.execute(f'DROP TYPE IF EXISTS {SCHEMA}.cage_state')
    op.create_table(
        'cages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('crab_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        *__timestamps(),
        sa.PrimaryKeyConstraint('id', name='pk_cages'),
        sa.UniqueConstraint('crab_id', name='uq_cages_crab_id'),
        schema=SCHEMA,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('cages', schema=SCHEMA)
    op.create_table(
        'feeders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        *__timestamps(),
        sa.PrimaryKeyConstraint('id', name='pk_feeders'),
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
    for column in OLD_CAGE_INDEXES:
        op.create_index(f'ix_{SCHEMA}_cages_{column}', 'cages', [column], schema=SCHEMA)
    op.execute(f"ALTER TYPE {SCHEMA}.schedule_days RENAME VALUE 'mon-wed-fri-sun' TO 'mon-wed-fri'")

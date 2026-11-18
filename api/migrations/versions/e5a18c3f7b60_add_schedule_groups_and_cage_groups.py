"""add schedule groups and cage groups

Revision ID: e5a18c3f7b60
Revises: c7b05e2d9f14
Create Date: 2026-11-18 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a18c3f7b60'
down_revision: Union[str, Sequence[str], None] = 'c7b05e2d9f14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'devices'
CAGE_GROUP_INDEX = f'ix_{SCHEMA}_cages_group_code'
SCHEDULE_GROUP_INDEX = f'ix_{SCHEMA}_schedules_group_code'
JOIN_GROUP_INDEX = f'ix_{SCHEMA}_schedule_groups_group_code'
NAME_CHECK = 'ck_cages_name_in_group'


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('cages', sa.Column('group_code', sa.String(length=10), nullable=True), schema=SCHEMA)
    op.execute(f'UPDATE {SCHEMA}.cages SET group_code = left(cage_name, 1)')
    op.alter_column('cages', 'group_code', nullable=False, schema=SCHEMA)
    op.create_index(CAGE_GROUP_INDEX, 'cages', ['group_code'], schema=SCHEMA)
    op.create_check_constraint(NAME_CHECK, 'cages', 'left(cage_name, 1) = group_code', schema=SCHEMA)

    op.create_table(
        'schedule_groups',
        sa.Column('schedule_id', sa.Uuid(), nullable=False),
        sa.Column('group_code', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(
            ['schedule_id'],
            [f'{SCHEMA}.schedules.id'],
            name='fk_schedule_groups_schedule_id_schedules',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('schedule_id', 'group_code', name='pk_schedule_groups'),
        schema=SCHEMA,
    )
    op.create_index(JOIN_GROUP_INDEX, 'schedule_groups', ['group_code'], schema=SCHEMA)

    op.execute(
        f"""
        INSERT INTO {SCHEMA}.schedule_groups (schedule_id, group_code)
        SELECT id, group_code FROM {SCHEMA}.schedules WHERE group_code IS NOT NULL
        """
    )
    # A schedule with no group used to mean every group
    op.execute(
        f"""
        INSERT INTO {SCHEMA}.schedule_groups (schedule_id, group_code)
        SELECT schedule.id, cage_group.group_code
        FROM {SCHEMA}.schedules AS schedule
        CROSS JOIN (SELECT DISTINCT group_code FROM {SCHEMA}.cages) AS cage_group
        WHERE schedule.group_code IS NULL
        """
    )
    op.drop_index(SCHEDULE_GROUP_INDEX, table_name='schedules', schema=SCHEMA)
    op.drop_column('schedules', 'group_code', schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('schedules', sa.Column('group_code', sa.String(length=10), nullable=True), schema=SCHEMA)
    # The old column holds one group, so a schedule with several falls back to every group
    op.execute(
        f"""
        UPDATE {SCHEMA}.schedules AS schedule
        SET group_code = single.group_code
        FROM (
            SELECT schedule_id, min(group_code) AS group_code
            FROM {SCHEMA}.schedule_groups
            GROUP BY schedule_id
            HAVING count(*) = 1
        ) AS single
        WHERE single.schedule_id = schedule.id
        """
    )
    op.create_index(SCHEDULE_GROUP_INDEX, 'schedules', ['group_code'], schema=SCHEMA)
    op.drop_index(JOIN_GROUP_INDEX, table_name='schedule_groups', schema=SCHEMA)
    op.drop_table('schedule_groups', schema=SCHEMA)
    op.drop_constraint(NAME_CHECK, 'cages', schema=SCHEMA, type_='check')
    op.drop_index(CAGE_GROUP_INDEX, table_name='cages', schema=SCHEMA)
    op.drop_column('cages', 'group_code', schema=SCHEMA)

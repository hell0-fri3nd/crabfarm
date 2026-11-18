"""replace cage crab id with cage name

Revision ID: c7b05e2d9f14
Revises: a41c7e93d0b2
Create Date: 2026-11-18 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7b05e2d9f14'
down_revision: Union[str, Sequence[str], None] = 'a41c7e93d0b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'devices'
TABLE = 'cages'


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(TABLE, sa.Column('cage_name', sa.String(length=50), nullable=True), schema=SCHEMA)
    op.execute(
        f"""
        UPDATE {SCHEMA}.{TABLE} AS cage
        SET cage_name = crab.name
        FROM crab_management.crabs AS crab
        WHERE crab.id = cage.crab_id
        """
    )
    op.alter_column(TABLE, 'cage_name', nullable=False, schema=SCHEMA)
    op.create_unique_constraint('uq_cages_cage_name', TABLE, ['cage_name'], schema=SCHEMA)
    op.drop_constraint('uq_cages_crab_id', TABLE, schema=SCHEMA, type_='unique')
    op.drop_column(TABLE, 'crab_id', schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(TABLE, sa.Column('crab_id', sa.Integer(), nullable=True), schema=SCHEMA)
    op.execute(
        f"""
        UPDATE {SCHEMA}.{TABLE} AS cage
        SET crab_id = crab.id
        FROM crab_management.crabs AS crab
        WHERE crab.name = cage.cage_name
        """
    )
    op.alter_column(TABLE, 'crab_id', nullable=False, schema=SCHEMA)
    op.create_unique_constraint('uq_cages_crab_id', TABLE, ['crab_id'], schema=SCHEMA)
    op.drop_constraint('uq_cages_cage_name', TABLE, schema=SCHEMA, type_='unique')
    op.drop_column(TABLE, 'cage_name', schema=SCHEMA)

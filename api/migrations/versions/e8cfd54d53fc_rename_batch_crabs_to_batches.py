"""rename batch_crabs to batches

Revision ID: e8cfd54d53fc
Revises: 61cfad8116e2
Create Date: 2026-11-02 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e8cfd54d53fc'
down_revision: Union[str, Sequence[str], None] = '61cfad8116e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'crab_management'


def _rename(old: str, new: str) -> None:
    op.rename_table(old, new, schema=SCHEMA)
    op.execute(f'ALTER SEQUENCE {SCHEMA}.{old}_id_seq RENAME TO {new}_id_seq')
    op.execute(f'ALTER TABLE {SCHEMA}.{new} RENAME CONSTRAINT pk_{old} TO pk_{new}')
    op.execute(f'ALTER TABLE {SCHEMA}.{new} RENAME CONSTRAINT fk_{old}_user_id_users TO fk_{new}_user_id_users')
    op.execute(f'ALTER INDEX {SCHEMA}.ix_{SCHEMA}_{old}_user_id RENAME TO ix_{SCHEMA}_{new}_user_id')
    op.execute(f'ALTER TABLE {SCHEMA}.crab_logs RENAME CONSTRAINT fk_crab_logs_batch_id_{old} TO fk_crab_logs_batch_id_{new}')


def upgrade() -> None:
    """Upgrade schema."""
    _rename('batch_crabs', 'batches')


def downgrade() -> None:
    """Downgrade schema."""
    _rename('batches', 'batch_crabs')

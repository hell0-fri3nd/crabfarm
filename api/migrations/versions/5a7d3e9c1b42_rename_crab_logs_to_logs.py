"""rename crab_logs to logs

Revision ID: 5a7d3e9c1b42
Revises: f3b8a1d6c2e9
Create Date: 2026-11-16 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '5a7d3e9c1b42'
down_revision: Union[str, Sequence[str], None] = 'f3b8a1d6c2e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'crab_management'
COLUMNS = {'type': 'log_type', 'width': 'width_mm', 'weight': 'weight_g'}
INDEXES = {'batch_id': 'batch_id', 'crab_id': 'crab_id', 'user_id': 'user_id', 'type': 'log_type'}


def upgrade() -> None:
    """Upgrade schema."""
    op.rename_table('crab_logs', 'logs', schema=SCHEMA)
    op.execute(f'ALTER SEQUENCE {SCHEMA}.crab_logs_id_seq RENAME TO logs_id_seq')
    op.execute(f'ALTER TABLE {SCHEMA}.logs RENAME CONSTRAINT pk_crab_logs TO pk_logs')
    op.execute(f'ALTER TABLE {SCHEMA}.logs RENAME CONSTRAINT fk_crab_logs_batch_id_batches TO fk_logs_batch_id_batches')
    op.execute(f'ALTER TABLE {SCHEMA}.logs RENAME CONSTRAINT fk_crab_logs_crab_id_crabs TO fk_logs_crab_id_crabs')

    for old, new in COLUMNS.items():
        op.alter_column('logs', old, new_column_name=new, schema=SCHEMA)

    for old, new in INDEXES.items():
        op.execute(f'ALTER INDEX {SCHEMA}.ix_{SCHEMA}_crab_logs_{old} RENAME TO ix_{SCHEMA}_logs_{new}')

    op.execute('ALTER TYPE public.crab_logs_enum RENAME TO log_type')
    op.execute(f'ALTER TYPE public.log_type SET SCHEMA {SCHEMA}')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(f'ALTER TYPE {SCHEMA}.log_type SET SCHEMA public')
    op.execute('ALTER TYPE public.log_type RENAME TO crab_logs_enum')

    for old, new in INDEXES.items():
        op.execute(f'ALTER INDEX {SCHEMA}.ix_{SCHEMA}_logs_{new} RENAME TO ix_{SCHEMA}_crab_logs_{old}')

    for old, new in COLUMNS.items():
        op.alter_column('logs', new, new_column_name=old, schema=SCHEMA)

    op.execute(f'ALTER TABLE {SCHEMA}.logs RENAME CONSTRAINT fk_logs_crab_id_crabs TO fk_crab_logs_crab_id_crabs')
    op.execute(f'ALTER TABLE {SCHEMA}.logs RENAME CONSTRAINT fk_logs_batch_id_batches TO fk_crab_logs_batch_id_batches')
    op.execute(f'ALTER TABLE {SCHEMA}.logs RENAME CONSTRAINT pk_logs TO pk_crab_logs')
    op.execute(f'ALTER SEQUENCE {SCHEMA}.logs_id_seq RENAME TO crab_logs_id_seq')
    op.rename_table('logs', 'crab_logs', schema=SCHEMA)

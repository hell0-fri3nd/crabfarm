"""drop auth sessions table

Revision ID: c7d18e5a02f4
Revises: a4c9e2f17b3d
Create Date: 2026-11-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c7d18e5a02f4'
down_revision: Union[str, Sequence[str], None] = 'a4c9e2f17b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REVOKED_REASONS = (
    'signed_out',
    'rotated',
    'pin_locked',
    'reuse_detected',
    'deactivated',
    'credentials_reset',
)


def upgrade() -> None:
    """Upgrade schema."""
    # Refresh tokens are stateless JWTs again; nothing tracks them server-side
    op.drop_index('ix_auth_sessions_user_id', table_name='sessions', schema='auth')
    op.drop_table('sessions', schema='auth')
    op.execute('DROP TYPE IF EXISTS auth.session_revoked_reason')


def downgrade() -> None:
    """Downgrade schema."""
    revoked_reason = postgresql.ENUM(*REVOKED_REASONS, name='session_revoked_reason', schema='auth')
    revoked_reason.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('is_remembered', sa.Boolean(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('failed_pin_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'revoked_reason',
            postgresql.ENUM(*REVOKED_REASONS, name='session_revoked_reason', schema='auth', create_type=False),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(
            ['user_id'], ['auth.users.id'], name='fk_sessions_user_id_users', ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_sessions'),
        schema='auth',
    )
    op.create_index('ix_auth_sessions_user_id', 'sessions', ['user_id'], unique=False, schema='auth')

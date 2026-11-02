"""seed default user

Revision ID: 538a8836284b
Revises: d8ce1eff817c
Create Date: 2026-11-01 23:10:32.235062

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '538a8836284b'
down_revision: Union[str, Sequence[str], None] = 'd8ce1eff817c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_USER_EMAIL = 'hellofriend@crabfarm.ph'

# Argon2id hashes from PasswordServices; the plaintext values are shared outside the repo
DEFAULT_USER_PASSWORD = '$argon2id$v=19$m=65536,t=3,p=4$cWGggHgfLlR3TDnF+m3g2g$6U6S4bax9MQlr+mhYSezqcIItvNg+eYlBwCHE92lReM'
DEFAULT_USER_PIN = '$argon2id$v=19$m=65536,t=3,p=4$btgQJwU3NWbPKQi+SqampA$YK9ZzXIXzNM93TvbY0SDXo2hZ172UbOi2WQKfWA0KDQ'


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        sa.text(
            """
            INSERT INTO auth.users (id, name, email, password, pin, role)
            VALUES (gen_random_uuid(), :name, :email, :password, :pin, CAST(:role AS role))
            ON CONFLICT (email) DO NOTHING
            """
        ).bindparams(
            name='Hello Friend',
            email=DEFAULT_USER_EMAIL,
            password=DEFAULT_USER_PASSWORD,
            pin=DEFAULT_USER_PIN,
            role='ADMIN',
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        sa.text('DELETE FROM auth.users WHERE email = :email').bindparams(
            email=DEFAULT_USER_EMAIL
        )
    )

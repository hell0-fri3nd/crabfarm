from pydantic import BaseModel, Field

from app.devices.feeding import NextFeedRead


class DashboardSummary(BaseModel):
    """The dashboard's headline figures. It is both the REST body and the `dashboard.summary` event."""

    crabs_logged_today: int = Field(ge=0)
    crabs_total: int = Field(ge=0)
    next_feed: NextFeedRead | None

from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class RecordStickerDownloadRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {"batch_id": 1, "crab_ids": [1, 2, 3], "file_type": "pdf", "sticker_size_mm": 40, "paper": "a4"},
        },
    )

    batch_id: int = Field(gt=0)
    crab_ids: list[int] = Field(min_length=1, max_length=500)
    file_type: Literal["pdf", "png"]
    sticker_size_mm: Literal[30, 40, 50]
    paper: Literal["a4", "short", "long"]

    @field_validator("crab_ids")
    @classmethod
    def unique_crab_ids(cls, crab_ids: list[int]) -> list[int]:
        if any(crab_id <= 0 for crab_id in crab_ids):
            raise ValueError("Crab ids must be positive")
        return list(dict.fromkeys(crab_ids))

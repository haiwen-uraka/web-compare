from pydantic import BaseModel, Field
from typing import Literal


class ComparisonRequest(BaseModel):
    url_a: str
    url_b: str
    viewport_width: int = Field(default=1280, ge=320, le=3840)
    viewport_height: int = Field(default=720, ge=240, le=2160)
    full_page: bool = True
    comparisons: list[Literal["dom", "visual", "text"]] = Field(
        default=["dom", "visual", "text"], min_length=1
    )

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CaptureError(BaseModel):
    url: str
    message: str


class PageCaptureResult(BaseModel):
    screenshot_path: str
    dom_path: str
    text_path: str
    error: Optional[CaptureError] = None


class DOMElementDiff(BaseModel):
    tag: str
    path: str
    reason: str  # added | removed | attribute_changed | text_changed
    details: dict = {}


class DOMDiffResult(BaseModel):
    total_elements_a: int = 0
    total_elements_b: int = 0
    matching_elements: int = 0
    added_elements: list[DOMElementDiff] = []
    removed_elements: list[DOMElementDiff] = []
    attribute_changes: list[DOMElementDiff] = []
    text_changes: list[DOMElementDiff] = []


class TextDiffBlock(BaseModel):
    type: str  # equal | replace | delete | insert
    lines_a_start: int = 0
    lines_a_end: int = 0
    lines_b_start: int = 0
    lines_b_end: int = 0
    content_a: list[str] = []
    content_b: list[str] = []


class TextDiffResult(BaseModel):
    total_chars_a: int = 0
    total_chars_b: int = 0
    total_lines_a: int = 0
    total_lines_b: int = 0
    blocks: list[TextDiffBlock] = []
    added_lines: list[str] = []
    removed_lines: list[str] = []


class DiffRegion(BaseModel):
    x: int
    y: int
    width: int
    height: int
    diff_pixel_count: int
    diff_ratio: float


class VisualDiffResult(BaseModel):
    diff_percentage: float = 0.0
    diff_pixel_count: int = 0
    total_pixels: int = 0
    screenshot_path_a: str = ""
    screenshot_path_b: str = ""
    diff_image_path: str = ""
    highlight_path_a: str = ""
    highlight_path_b: str = ""
    width_a: int = 0
    height_a: int = 0
    width_b: int = 0
    height_b: int = 0
    diff_regions: list[DiffRegion] = []


class ComparisonSummary(BaseModel):
    dom_diff_count: int = 0
    visual_diff_percentage: float = 0.0
    text_diff_count: int = 0


class ComparisonResult(BaseModel):
    id: str
    status: str  # pending | processing | completed | failed | partial
    created_at: datetime
    completed_at: Optional[datetime] = None
    url_a: str
    url_b: str
    error: Optional[str] = None

    capture_a: Optional[PageCaptureResult] = None
    capture_b: Optional[PageCaptureResult] = None
    summary: ComparisonSummary = ComparisonSummary()
    dom_diff: Optional[DOMDiffResult] = None
    visual_diff: Optional[VisualDiffResult] = None
    text_diff: Optional[TextDiffResult] = None


class ComparisonListItem(BaseModel):
    id: str
    status: str
    created_at: datetime
    url_a: str
    url_b: str
    summary: ComparisonSummary = ComparisonSummary()

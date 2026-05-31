import io
import logging
from PIL import Image
import numpy as np

from app.models.results import VisualDiffResult, DiffRegion

logger = logging.getLogger(__name__)

DIFF_THRESHOLD = 10  # 0-255, per-channel average difference to count as "different"
HIGHLIGHT_COLOR = (255, 0, 0)  # Red overlay for differences
MIN_REGION_AREA = 100  # minimum pixels for a diff region


def compare_visual(
    screenshot_a: bytes | None,
    screenshot_b: bytes | None,
) -> tuple[VisualDiffResult, bytes | None, bytes | None, bytes | None]:
    """Compare two screenshots and return result + diff image + highlight images.

    Returns:
        (result, diff_png_bytes, highlight_a_png_bytes, highlight_b_png_bytes)
    """
    result = VisualDiffResult()

    if not screenshot_a or not screenshot_b:
        return result, None, None, None

    try:
        img_a = Image.open(io.BytesIO(screenshot_a)).convert("RGB")
        img_b = Image.open(io.BytesIO(screenshot_b)).convert("RGB")
    except Exception as e:
        logger.error("Failed to decode screenshots: %s", e)
        return result, None, None, None

    result.width_a, result.height_a = img_a.size
    result.width_b, result.height_b = img_b.size

    # Normalize to same dimensions
    max_w = max(img_a.width, img_b.width)
    max_h = max(img_a.height, img_b.height)

    canvas_a = Image.new("RGB", (max_w, max_h), (255, 255, 255))
    canvas_b = Image.new("RGB", (max_w, max_h), (255, 255, 255))
    canvas_a.paste(img_a, (0, 0))
    canvas_b.paste(img_b, (0, 0))

    arr_a = np.array(canvas_a, dtype=np.int16)
    arr_b = np.array(canvas_b, dtype=np.int16)

    # Per-pixel difference across RGB channels
    diff = np.abs(arr_a - arr_b)
    pixel_diff = diff.mean(axis=2)

    diff_mask = pixel_diff > DIFF_THRESHOLD

    result.total_pixels = diff_mask.size
    result.diff_pixel_count = int(diff_mask.sum())
    result.diff_percentage = round(
        (result.diff_pixel_count / result.total_pixels) * 100, 2
    )

    # Detect diff regions
    result.diff_regions = _detect_diff_regions(diff_mask)

    # Generate diff highlight image (amplify differences)
    diff_arr = np.clip(diff, 0, 255).astype(np.uint8)
    diff_img = Image.fromarray(diff_arr, "RGB")
    diff_png = _to_png_bytes(diff_img)

    # Generate highlight images (red overlay where different)
    highlight_a = _apply_highlight(np.array(canvas_a, dtype=np.uint8), diff_mask)
    highlight_b = _apply_highlight(np.array(canvas_b, dtype=np.uint8), diff_mask)
    highlight_a_png = _to_png_bytes(highlight_a)
    highlight_b_png = _to_png_bytes(highlight_b)

    return result, diff_png, highlight_a_png, highlight_b_png


def _detect_diff_regions(diff_mask: np.ndarray) -> list[DiffRegion]:
    """Detect connected diff regions in the diff mask."""
    try:
        from scipy import ndimage
    except ImportError:
        return []

    labeled, num_features = ndimage.label(diff_mask)
    regions = []
    for i in range(1, num_features + 1):
        ys, xs = np.where(labeled == i)
        if len(xs) < MIN_REGION_AREA:
            continue
        x, y = int(xs.min()), int(ys.min())
        w, h = int(xs.max() - x + 1), int(ys.max() - y + 1)
        region_pixels = diff_mask[ys, xs]
        diff_count = int(np.sum(region_pixels))
        total = len(region_pixels)
        regions.append(DiffRegion(
            x=x, y=y, width=w, height=h,
            diff_pixel_count=diff_count,
            diff_ratio=round(diff_count / total * 100, 1),
        ))

    regions.sort(key=lambda r: r.diff_pixel_count, reverse=True)
    return regions[:20]  # top 20 regions


def _apply_highlight(
    arr: np.ndarray, mask: np.ndarray, alpha: float = 0.4
) -> Image.Image:
    """Apply a red highlight overlay to pixels where mask is True."""
    result_arr = arr.copy()
    for c in range(3):
        result_arr[:, :, c] = np.where(
            mask,
            (result_arr[:, :, c] * (1 - alpha) + HIGHLIGHT_COLOR[c] * alpha).astype(np.uint8),
            result_arr[:, :, c],
        )
    return Image.fromarray(result_arr, "RGB")


def _to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

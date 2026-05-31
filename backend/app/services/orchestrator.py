import asyncio
import logging
import json
from datetime import datetime, timezone

from app.models.requests import ComparisonRequest
from app.models.results import (
    ComparisonResult,
    ComparisonSummary,
    PageCaptureResult,
    CaptureError,
)
from app.services.browser import get_browser
from app.services.dom_comparator import compare_dom
from app.services.visual_comparator import compare_visual
from app.services.text_comparator import compare_text
from app.services.storage import FileStorage
from app.services.cache import comparison_cache

logger = logging.getLogger(__name__)


async def run_comparison(
    task_id: str,
    request: ComparisonRequest,
    task_store: dict,
) -> None:
    """Run the full comparison pipeline and store results."""
    storage = FileStorage()
    result = task_store[task_id]

    try:
        result.status = "processing"
        browser = await get_browser()

        # Step 1: Capture pages. When URLs are identical, capture once and reuse.
        same_url = request.url_a.strip().lower() == request.url_b.strip().lower()
        logger.info("Capturing pages: %s vs %s (same_url=%s)", request.url_a, request.url_b, same_url)

        if same_url:
            cap_a = await browser.capture_page(
                request.url_a, request.viewport_width, request.viewport_height, request.full_page
            )
            cap_b = cap_a
        else:
            capture_a_task = browser.capture_page(
                request.url_a, request.viewport_width, request.viewport_height, request.full_page
            )
            capture_b_task = browser.capture_page(
                request.url_b, request.viewport_width, request.viewport_height, request.full_page
            )
            cap_a, cap_b = await asyncio.gather(capture_a_task, capture_b_task)

        # Save captures to disk
        if cap_a.screenshot:
            storage.save_file(task_id, "screenshot-a.png", cap_a.screenshot)
        if cap_b.screenshot:
            storage.save_file(task_id, "screenshot-b.png", cap_b.screenshot)
        if cap_a.dom_tree is not None:
            storage.save_json(task_id, "dom-a.json", {"elements": cap_a.dom_tree})
        if cap_b.dom_tree is not None:
            storage.save_json(task_id, "dom-b.json", {"elements": cap_b.dom_tree})
        if cap_a.text_content is not None:
            storage.save_file(task_id, "text-a.txt", cap_a.text_content.encode("utf-8"))
        if cap_b.text_content is not None:
            storage.save_file(task_id, "text-b.txt", cap_b.text_content.encode("utf-8"))

        # Save capture results into result model
        result.capture_a = PageCaptureResult(
            screenshot_path=f"screenshot-a.png",
            dom_path="dom-a.json",
            text_path="text-a.txt",
            error=CaptureError(url=request.url_a, message=cap_a.error) if cap_a.error else None,
        )
        result.capture_b = PageCaptureResult(
            screenshot_path=f"screenshot-b.png",
            dom_path="dom-b.json",
            text_path="text-b.txt",
            error=CaptureError(url=request.url_b, message=cap_b.error) if cap_b.error else None,
        )

        # Step 2: Run requested comparisons
        comparisons = request.comparisons
        tasks = []

        if "dom" in comparisons:
            tasks.append(
                _run_dom_compare(task_id, result, cap_a.dom_tree, cap_b.dom_tree)
            )
        if "visual" in comparisons:
            tasks.append(
                _run_visual_compare(task_id, result, cap_a.screenshot, cap_b.screenshot, storage)
            )
        if "text" in comparisons:
            tasks.append(
                _run_text_compare(result, cap_a.text_content, cap_b.text_content)
            )

        if tasks:
            await asyncio.gather(*tasks)

        # Build summary
        summary = ComparisonSummary()
        if result.dom_diff:
            summary.dom_diff_count = (
                len(result.dom_diff.added_elements)
                + len(result.dom_diff.removed_elements)
                + len(result.dom_diff.attribute_changes)
                + len(result.dom_diff.text_changes)
            )
        if result.visual_diff:
            summary.visual_diff_percentage = result.visual_diff.diff_percentage
        if result.text_diff:
            summary.text_diff_count = (
                len(result.text_diff.added_lines) + len(result.text_diff.removed_lines)
            )
        result.summary = summary

        has_errors = (
            (cap_a.error and "Failed" in cap_a.error)
            or (cap_b.error and "Failed" in cap_b.error)
        )
        result.status = "partial" if has_errors else "completed"
        result.completed_at = datetime.now(timezone.utc)

        # Persist result to disk
        storage.save_json(task_id, "result.json", result.model_dump(mode="json"))

        # Cache completed/partial results
        comparison_cache.put(request.url_a, request.url_b, result)

        logger.info("Comparison %s complete with status %s", task_id, result.status)

    except Exception as e:
        logger.error("Comparison %s failed: %s", task_id, e, exc_info=True)
        result.status = "failed"
        result.error = str(e)
        result.completed_at = datetime.now(timezone.utc)
        storage.save_json(task_id, "result.json", result.model_dump(mode="json"))


async def _run_dom_compare(task_id, result, dom_a, dom_b):
    result.dom_diff = compare_dom(dom_a, dom_b)


async def _run_visual_compare(task_id, result, screenshot_a, screenshot_b, storage):
    vis_result, diff_png, hl_a_png, hl_b_png = compare_visual(screenshot_a, screenshot_b)

    if diff_png:
        storage.save_file(task_id, "diff-visual.png", diff_png)
        vis_result.diff_image_path = "diff-visual.png"
    if hl_a_png:
        storage.save_file(task_id, "highlight-a.png", hl_a_png)
        vis_result.highlight_path_a = "highlight-a.png"
    if hl_b_png:
        storage.save_file(task_id, "highlight-b.png", hl_b_png)
        vis_result.highlight_path_b = "highlight-b.png"

    result.visual_diff = vis_result


async def _run_text_compare(result, text_a, text_b):
    result.text_diff = compare_text(text_a, text_b)

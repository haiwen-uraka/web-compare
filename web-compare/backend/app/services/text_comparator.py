import difflib
import logging

from app.models.results import TextDiffResult, TextDiffBlock

logger = logging.getLogger(__name__)


def compare_text(text_a: str | None, text_b: str | None) -> TextDiffResult:
    result = TextDiffResult()

    if text_a is None and text_b is None:
        return result

    text_a = text_a or ""
    text_b = text_b or ""

    result.total_chars_a = len(text_a)
    result.total_chars_b = len(text_b)

    lines_a = text_a.splitlines(keepends=True)
    lines_b = text_b.splitlines(keepends=True)

    result.total_lines_a = len(lines_a)
    result.total_lines_b = len(lines_b)

    matcher = difflib.SequenceMatcher(None, lines_a, lines_b, autojunk=False)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        block = TextDiffBlock(
            type=tag,
            lines_a_start=i1 + 1,
            lines_a_end=i2,
            lines_b_start=j1 + 1,
            lines_b_end=j2,
            content_a=[l.rstrip("\n\r") for l in lines_a[i1:i2]],
            content_b=[l.rstrip("\n\r") for l in lines_b[j1:j2]],
        )
        result.blocks.append(block)

    # Compute simple added/removed lines
    set_a = set(l.rstrip("\n\r") for l in lines_a)
    set_b = set(l.rstrip("\n\r") for l in lines_b)
    result.added_lines = [l for l in set_b if l not in set_a]
    result.removed_lines = [l for l in set_a if l not in set_b]

    return result

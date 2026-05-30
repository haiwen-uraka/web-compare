"""Tests for the DOM path deduplication logic.

Validates the fixed algorithm (counter-based) correctly handles elements
with the same path by generating unique :nth-of-type(N) suffixes.

This reproduces the bug from the original filter-based approach and
confirms the fix prevents path collisions.
"""

import pytest


# OLD buggy logic (using filter-based count)
def _old_generate_paths(elements):
    """Simulates the OLD buggy DOM_EXTRACTOR_JS dedup logic."""
    results = []
    seen = set()

    for el in elements:
        tag = el["tag"]
        classes = el.get("classes", [])
        parent = el.get("parent", "")

        selector = tag + ("." + ".".join(classes) if classes else "")
        fullPath = parent + " > " + selector if parent else selector

        if fullPath in seen:
            idx = len([r for r in results if r == fullPath]) + 1
            deduped = selector + ":nth-of-type(" + str(idx) + ")"
            finalPath = parent + " > " + deduped if parent else deduped
        else:
            finalPath = fullPath

        seen.add(finalPath)
        results.append(finalPath)

    return results


# NEW fixed logic (using counter map)
def _new_generate_paths(elements):
    """Simulates the FIXED DOM_EXTRACTOR_JS dedup logic."""
    results = []
    seen = {}  # Map: fullPath -> count

    for el in elements:
        tag = el["tag"]
        classes = el.get("classes", [])
        parent = el.get("parent", "")

        selector = tag + ("." + ".".join(classes) if classes else "")
        fullPath = parent + " > " + selector if parent else selector

        cnt = seen.get(fullPath, 0) + 1
        seen[fullPath] = cnt

        if cnt > 1:
            deduped = selector + ":nth-of-type(" + str(cnt) + ")"
            finalPath = parent + " > " + deduped if parent else deduped
        else:
            finalPath = fullPath

        results.append(finalPath)

    return results


class TestOldLogicBug:
    """Confirm the OLD logic produces path collisions (the original bug)."""

    def test_three_identical_elements_produce_collision(self):
        elements = [
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
        ]
        paths = _old_generate_paths(elements)
        # The old logic gives element 2 and 3 the SAME path
        assert len(set(paths)) < len(paths), (
            f"BUG CONFIRMED: Duplicate paths generated: {paths}"
        )

    def test_old_logic_duplicate_count(self):
        elements = [
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
        ]
        paths = _old_generate_paths(elements)
        assert len(paths) == 4
        assert len(set(paths)) < 4


class TestNewLogicFix:
    """Confirm the NEW logic generates unique paths."""

    def test_three_identical_elements_unique_paths(self):
        elements = [
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
        ]
        paths = _new_generate_paths(elements)
        assert len(set(paths)) == len(paths), (
            f"All paths must be unique, got: {paths}"
        )

    def test_five_identical_elements_unique_paths(self):
        elements = [
            {"tag": "div", "classes": ["item"], "parent": "body"}
            for _ in range(5)
        ]
        paths = _new_generate_paths(elements)
        assert len(set(paths)) == 5

    def test_paths_have_correct_format(self):
        elements = [
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
        ]
        paths = _new_generate_paths(elements)
        assert paths[0] == "body > div.item"
        assert paths[1] == "body > div.item:nth-of-type(2)"
        assert paths[2] == "body > div.item:nth-of-type(3)"

    def test_no_duplicates_when_all_unique(self):
        elements = [
            {"tag": "div", "classes": ["a"], "parent": "body"},
            {"tag": "div", "classes": ["b"], "parent": "body"},
            {"tag": "p", "classes": [], "parent": "body > div.a"},
        ]
        paths = _new_generate_paths(elements)
        assert len(set(paths)) == 3
        assert ":nth-of-type" not in paths[0]
        assert ":nth-of-type" not in paths[1]

    def test_mixed_unique_and_duplicate(self):
        elements = [
            {"tag": "div", "classes": ["a"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
            {"tag": "div", "classes": ["item"], "parent": "body"},
        ]
        paths = _new_generate_paths(elements)
        assert len(set(paths)) == 4
        assert "body > div.a" in paths
        assert "body > div.item" in paths
        assert "body > div.item:nth-of-type(2)" in paths
        assert "body > div.item:nth-of-type(3)" in paths

    def test_nested_duplicates(self):
        elements = [
            {"tag": "div", "classes": [], "parent": "body"},
            {"tag": "div", "classes": [], "parent": "body"},
            {"tag": "p", "classes": [], "parent": "body > div:nth-of-type(2)"},
            {"tag": "p", "classes": [], "parent": "body > div:nth-of-type(2)"},
        ]
        paths = _new_generate_paths(elements)
        assert len(set(paths)) == 4

    def test_id_selector_no_dedup_needed(self):
        elements = [
            {"tag": "div", "classes": [], "parent": "body"},
            {"tag": "div", "classes": [], "parent": "body"},
        ]
        paths = _new_generate_paths(elements)
        assert paths[0] == "body > div"
        assert paths[1] == "body > div:nth-of-type(2)"

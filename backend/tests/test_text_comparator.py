import pytest
from app.services.text_comparator import compare_text
from app.models.results import TextDiffResult


class TestIdenticalInputs:
    def test_both_none_returns_empty(self):
        result = compare_text(None, None)
        assert result.total_chars_a == 0
        assert result.total_chars_b == 0
        assert result.total_lines_a == 0
        assert result.total_lines_b == 0
        assert result.blocks == []
        assert result.added_lines == []
        assert result.removed_lines == []

    def test_both_empty_string(self):
        result = compare_text("", "")
        assert result.total_chars_a == 0
        assert result.total_chars_b == 0
        assert result.added_lines == []
        assert result.removed_lines == []

    def test_identical_single_line(self):
        text = "Hello World"
        result = compare_text(text, text)
        assert result.total_chars_a == len(text)
        assert result.total_chars_b == len(text)
        assert result.total_lines_a == 1
        assert result.total_lines_b == 1
        assert len(result.blocks) == 1
        assert result.blocks[0].type == "equal"
        assert result.added_lines == []
        assert result.removed_lines == []

    def test_identical_multi_line(self):
        text = "Line 1\nLine 2\nLine 3"
        result = compare_text(text, text)
        assert result.total_lines_a == 3
        assert result.total_lines_b == 3
        assert result.added_lines == []
        assert result.removed_lines == []
        all_equal = all(b.type == "equal" for b in result.blocks)
        assert all_equal

    def test_copy_with_same_content_is_identical(self):
        text_a = "Hello\nWorld"
        text_b = "Hello\nWorld"
        result = compare_text(text_a, text_b)
        assert result.added_lines == []
        assert result.removed_lines == []

    def test_identical_with_trailing_newline(self):
        text = "Line\n"
        result = compare_text(text, text)
        assert result.added_lines == []
        assert result.removed_lines == []


class TestDifferentInputs:
    def test_none_vs_text(self):
        result = compare_text(None, "Hello")
        assert result.total_chars_a == 0
        assert result.total_chars_b == 5
        assert len(result.removed_lines) == 0
        assert len(result.added_lines) > 0

    def test_text_vs_none(self):
        result = compare_text("Hello", None)
        assert result.total_chars_a == 5
        assert result.total_chars_b == 0
        assert len(result.removed_lines) > 0
        assert len(result.added_lines) == 0

    def test_single_line_changed(self):
        result = compare_text("Old Line", "New Line")
        assert len(result.added_lines) == 1
        assert len(result.removed_lines) == 1

    def test_one_line_added(self):
        result = compare_text("Line 1", "Line 1\nLine 2")
        assert len(result.added_lines) == 1
        assert "Line 2" in result.added_lines

    def test_one_line_removed(self):
        result = compare_text("Line 1\nLine 2", "Line 1")
        assert len(result.removed_lines) == 1
        assert "Line 2" in result.removed_lines

    def test_completely_different(self):
        result = compare_text("AAA\nBBB", "XXX\nYYY")
        assert len(result.added_lines) == 2
        assert len(result.removed_lines) == 2


class TestCharacterAndLineCounts:
    def test_correct_char_counts(self):
        result = compare_text("abc", "abcdef")
        assert result.total_chars_a == 3
        assert result.total_chars_b == 6

    def test_correct_line_counts(self):
        result = compare_text("a\nb\nc", "x\ny")
        assert result.total_lines_a == 3
        assert result.total_lines_b == 2

    def test_empty_line_handling(self):
        result = compare_text("a\n\nb", "a\nb")
        assert result.total_lines_a == 3
        assert result.total_lines_b == 2


class TestSequenceMatcherBlocks:
    def test_blocks_have_correct_types(self):
        result = compare_text("Line1\nLine2", "Line1\nLine3")
        types = [b.type for b in result.blocks]
        assert "equal" in types
        assert "delete" in types or "replace" in types
        assert "insert" in types or "replace" in types

    def test_block_has_content(self):
        result = compare_text("Hello", "World")
        for block in result.blocks:
            if block.type in ("delete", "replace"):
                assert len(block.content_a) > 0
            if block.type in ("insert", "replace"):
                assert len(block.content_b) > 0

    def test_block_line_numbers_are_1_based(self):
        result = compare_text("A\nB\nC", "A\nX\nC")
        for block in result.blocks:
            if block.type == "equal":
                assert block.lines_a_start >= 1
                assert block.lines_b_start >= 1


class TestSetBasedDiff:
    def test_added_lines_uses_set_semantics(self):
        """Duplicate lines in source only appear once in added_lines."""
        result = compare_text("A\nA", "A\nA\nB")
        assert "B" in result.added_lines

    def test_removed_lines_uses_set_semantics(self):
        """Duplicate lines only appear once in removed_lines."""
        result = compare_text("A\nA\nB", "A\nA")
        assert "B" in result.removed_lines

    def test_same_content_different_order_no_set_diff(self):
        result = compare_text("A\nB", "B\nA")
        assert result.added_lines == []
        assert result.removed_lines == []

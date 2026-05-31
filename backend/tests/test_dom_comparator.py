import pytest
from app.services.dom_comparator import compare_dom
from app.models.results import DOMDiffResult


def _el(tag="div", path="body > div", text=None, classes=None, attributes=None):
    el = {"tag": tag, "path": path}
    if text is not None:
        el["text"] = text
    if classes is not None:
        el["classes"] = classes
    if attributes is not None:
        el["attributes"] = attributes
    return el


class TestIdenticalInputs:
    def test_both_none_returns_empty(self):
        result = compare_dom(None, None)
        assert result.total_elements_a == 0
        assert result.total_elements_b == 0
        assert result.matching_elements == 0
        assert result.added_elements == []
        assert result.removed_elements == []
        assert result.attribute_changes == []
        assert result.text_changes == []

    def test_both_empty_lists(self):
        result = compare_dom([], [])
        assert result.total_elements_a == 0
        assert result.total_elements_b == 0
        assert result.matching_elements == 0

    def test_identical_single_element(self):
        tree = [_el("div", "body > div", text="Hello")]
        result = compare_dom(tree, tree)
        assert result.matching_elements == 1
        assert result.added_elements == []
        assert result.removed_elements == []
        assert result.attribute_changes == []
        assert result.text_changes == []

    def test_identical_multi_element(self):
        tree = [
            _el("div", "body > div", text="A"),
            _el("span", "body > div > span", text="B"),
            _el("p", "body > div > p", text="C"),
        ]
        result = compare_dom(tree, tree)
        assert result.total_elements_a == 3
        assert result.total_elements_b == 3
        assert result.matching_elements == 3
        assert len(result.added_elements) == 0
        assert len(result.removed_elements) == 0
        assert len(result.attribute_changes) == 0
        assert len(result.text_changes) == 0

    def test_copy_with_same_content_is_identical(self):
        tree_a = [
            _el("div", "body > div", text="Hello"),
            _el("p", "body > div > p", text="World"),
        ]
        tree_b = [
            _el("div", "body > div", text="Hello"),
            _el("p", "body > div > p", text="World"),
        ]
        result = compare_dom(tree_a, tree_b)
        assert result.matching_elements == 2
        assert len(result.added_elements) == 0
        assert len(result.removed_elements) == 0
        assert len(result.attribute_changes) == 0
        assert len(result.text_changes) == 0

    def test_unique_paths_no_collision(self):
        tree = [
            _el("div", "body > div", text="A"),
            _el("div", "body > div:nth-of-type(2)", text="B"),
            _el("div", "body > div:nth-of-type(3)", text="C"),
        ]
        result = compare_dom(tree, tree)
        assert result.matching_elements == 3
        assert len(result.added_elements) == 0


class TestDifferentInputs:
    def test_none_vs_tree_detects_all_as_added_or_removed(self):
        tree = [_el("div", "body > div")]
        result = compare_dom(tree, None)
        assert result.total_elements_a == 1
        assert result.total_elements_b == 0
        assert result.matching_elements == 0
        assert len(result.removed_elements) == 1
        assert result.removed_elements[0].reason == "removed"

    def test_none_vs_tree_b_side(self):
        tree = [_el("div", "body > div")]
        result = compare_dom(None, tree)
        assert result.total_elements_a == 0
        assert result.total_elements_b == 1
        assert len(result.added_elements) == 1
        assert result.added_elements[0].reason == "added"

    def test_completely_different_paths(self):
        tree_a = [_el("div", "body > div-a")]
        tree_b = [_el("div", "body > div-b")]
        result = compare_dom(tree_a, tree_b)
        assert result.matching_elements == 0
        assert len(result.removed_elements) == 1
        assert len(result.added_elements) == 1

    def test_partial_overlap(self):
        tree_a = [
            _el("div", "body > div", text="A"),
            _el("p", "body > div > p", text="B"),
        ]
        tree_b = [
            _el("div", "body > div", text="A"),
            _el("span", "body > div > span", text="C"),
        ]
        result = compare_dom(tree_a, tree_b)
        assert result.matching_elements == 1
        assert len(result.removed_elements) == 1
        assert len(result.added_elements) == 1


class TestAttributeChanges:
    def test_text_change_detected(self):
        tree_a = [_el("p", "body > p", text="Old text")]
        tree_b = [_el("p", "body > p", text="New text")]
        result = compare_dom(tree_a, tree_b)
        assert result.matching_elements == 1
        assert len(result.text_changes) == 1
        assert result.text_changes[0].details["old_text"] == "Old text"
        assert result.text_changes[0].details["new_text"] == "New text"

    def test_text_change_none_to_value(self):
        tree_a = [_el("p", "body > p", text=None)]
        tree_b = [_el("p", "body > p", text="Now has text")]
        result = compare_dom(tree_a, tree_b)
        assert len(result.text_changes) == 1

    def test_class_change_detected(self):
        tree_a = [_el("div", "body > div", classes=["a", "b"])]
        tree_b = [_el("div", "body > div", classes=["a", "c"])]
        result = compare_dom(tree_a, tree_b)
        assert len(result.attribute_changes) == 1
        change = result.attribute_changes[0]
        assert change.details["attribute"] == "class"

    def test_identical_classes_no_change(self):
        tree_a = [_el("div", "body > div", classes=["a", "b"])]
        tree_b = [_el("div", "body > div", classes=["b", "a"])]  # different order
        result = compare_dom(tree_a, tree_b)
        assert len(result.attribute_changes) == 0

    def test_custom_attribute_change(self):
        tree_a = [_el("div", "body > div", attributes={"href": "/old"})]
        tree_b = [_el("div", "body > div", attributes={"href": "/new"})]
        result = compare_dom(tree_a, tree_b)
        assert len(result.attribute_changes) == 1
        assert result.attribute_changes[0].details["attribute"] == "href"

    def test_custom_attribute_added(self):
        tree_a = [_el("div", "body > div", attributes={})]
        tree_b = [_el("div", "body > div", attributes={"title": "tooltip"})]
        result = compare_dom(tree_a, tree_b)
        assert len(result.attribute_changes) == 1
        assert result.attribute_changes[0].details["new_value"] == "tooltip"

    def test_multiple_attribute_changes(self):
        tree_a = [_el("div", "body > div", attributes={"a": "1", "b": "2"})]
        tree_b = [_el("div", "body > div", attributes={"a": "3", "b": "4"})]
        result = compare_dom(tree_a, tree_b)
        assert len(result.attribute_changes) == 2


class TestPathCollisionHandling:
    def test_duplicate_paths_in_input_do_not_cause_mismatch(self):
        tree = [
            _el("div", "body > div", text="First"),
            _el("div", "body > div", text="Second"),
            _el("div", "body > div", text="Third"),
        ]
        result = compare_dom(tree, tree)
        assert result.matching_elements == 3

    def test_duplicate_paths_with_one_difference(self):
        tree_a = [
            _el("div", "body > div", text="A"),
            _el("div", "body > div", text="B"),
        ]
        tree_b = [
            _el("div", "body > div", text="A"),
            _el("div", "body > div", text="C"),
        ]
        result = compare_dom(tree_a, tree_b)
        assert result.matching_elements == 2
        assert len(result.text_changes) == 1


class TestSummaryCounts:
    def test_all_zero_for_identical(self):
        tree = [
            _el("div", "body > div", text="A", classes=["x"], attributes={"k": "v"}),
        ]
        result = compare_dom(tree, tree)
        total_diffs = (
            len(result.added_elements)
            + len(result.removed_elements)
            + len(result.attribute_changes)
            + len(result.text_changes)
        )
        assert total_diffs == 0

    def test_total_diffs_counts_all_categories(self):
        tree_a = [
            _el("div", "body > div-a"),
            _el("p", "body > p", text="A", classes=["c1"], attributes={"x": "1"}),
        ]
        tree_b = [
            _el("div", "body > div-b"),
            _el("p", "body > p", text="B", classes=["c2"], attributes={"x": "2"}),
        ]
        result = compare_dom(tree_a, tree_b)
        total_diffs = (
            len(result.added_elements)
            + len(result.removed_elements)
            + len(result.attribute_changes)
            + len(result.text_changes)
        )
        # shared p has: 1 text change + 1 class change + 1 attr change = 3
        # added: 1 (div-b), removed: 1 (div-a)
        assert total_diffs == 5

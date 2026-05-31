import logging

from app.models.results import DOMDiffResult, DOMElementDiff

logger = logging.getLogger(__name__)


def _dedup_paths(elements: list[dict]) -> list[dict]:
    """Ensure each element has a unique path by appending an index suffix
    when the same path appears multiple times."""
    counts: dict[str, int] = {}
    result = []
    for el in elements:
        path = el["path"]
        cnt = counts.get(path, 0) + 1
        counts[path] = cnt
        if cnt > 1:
            el = {**el, "path": f"{path}__dup{cnt}"}
        result.append(el)
    return result


def compare_dom(tree_a: list[dict] | None, tree_b: list[dict] | None) -> DOMDiffResult:
    if tree_a is None and tree_b is None:
        return DOMDiffResult()

    result = DOMDiffResult()

    elements_a = _dedup_paths(tree_a or [])
    elements_b = _dedup_paths(tree_b or [])

    result.total_elements_a = len(elements_a)
    result.total_elements_b = len(elements_b)

    # Index by path
    map_a: dict[str, dict] = {e["path"]: e for e in elements_a}
    map_b: dict[str, dict] = {e["path"]: e for e in elements_b}

    paths_a = set(map_a.keys())
    paths_b = set(map_b.keys())

    # Find added and removed
    removed_paths = paths_a - paths_b
    added_paths = paths_b - paths_a
    common_paths = paths_a & paths_b

    result.matching_elements = len(common_paths)

    for path in sorted(removed_paths):
        el = map_a[path]
        result.removed_elements.append(
            DOMElementDiff(tag=el["tag"], path=path, reason="removed", details={})
        )

    for path in sorted(added_paths):
        el = map_b[path]
        result.added_elements.append(
            DOMElementDiff(tag=el["tag"], path=path, reason="added", details={})
        )

    # Compare common elements
    for path in sorted(common_paths):
        el_a = map_a[path]
        el_b = map_b[path]

        # Class changes
        classes_a = set(el_a.get("classes", []))
        classes_b = set(el_b.get("classes", []))
        if classes_a != classes_b:
            result.attribute_changes.append(
                DOMElementDiff(
                    tag=el_a["tag"],
                    path=path,
                    reason="attribute_changed",
                    details={
                        "attribute": "class",
                        "old_value": " ".join(sorted(classes_a)),
                        "new_value": " ".join(sorted(classes_b)),
                    },
                )
            )

        # Attribute changes
        attrs_a = el_a.get("attributes", {})
        attrs_b = el_b.get("attributes", {})
        all_keys = set(attrs_a.keys()) | set(attrs_b.keys())
        for key in sorted(all_keys):
            val_a = attrs_a.get(key)
            val_b = attrs_b.get(key)
            if val_a != val_b:
                result.attribute_changes.append(
                    DOMElementDiff(
                        tag=el_a["tag"],
                        path=path,
                        reason="attribute_changed",
                        details={
                            "attribute": key,
                            "old_value": val_a or "",
                            "new_value": val_b or "",
                        },
                    )
                )

        # Text changes
        text_a = el_a.get("text")
        text_b = el_b.get("text")
        if text_a != text_b:
            result.text_changes.append(
                DOMElementDiff(
                    tag=el_a["tag"],
                    path=path,
                    reason="text_changed",
                    details={"old_text": text_a or "", "new_text": text_b or ""},
                )
            )

    return result

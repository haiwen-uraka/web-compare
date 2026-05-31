import io
import pytest
from PIL import Image
from app.services.visual_comparator import compare_visual
from app.models.results import VisualDiffResult


def _make_png(w=100, h=100, color=(128, 128, 128)):
    img = Image.new("RGB", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_two_color_png(w=100, h=100, left_color=(0, 0, 0), right_color=(255, 255, 255)):
    img = Image.new("RGB", (w, h))
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            pixels[x, y] = left_color if x < w // 2 else right_color
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestIdenticalInputs:
    def test_both_none(self):
        result, diff, hl_a, hl_b = compare_visual(None, None)
        assert result.diff_percentage == 0.0
        assert result.diff_pixel_count == 0
        assert result.total_pixels == 0
        assert diff is None
        assert hl_a is None
        assert hl_b is None

    def test_one_none_one_bytes(self):
        png = _make_png()
        result, diff, hl_a, hl_b = compare_visual(png, None)
        assert result.diff_percentage == 0.0
        assert diff is None

    def test_identical_single_color(self):
        png = _make_png(100, 100, (50, 100, 150))
        result, diff, hl_a, hl_b = compare_visual(png, png)
        assert result.diff_percentage == 0.0
        assert result.diff_pixel_count == 0
        assert result.total_pixels == 10000
        assert diff is not None

    def test_copy_of_same_bytes_is_identical(self):
        png_a = _make_png(50, 50, (200, 100, 50))
        png_b = png_a
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage == 0.0
        assert result.diff_pixel_count == 0

    def test_different_bytes_same_rgb_is_identical(self):
        png_a = _make_png(30, 30, (255, 0, 0))
        png_b = _make_png(30, 30, (255, 0, 0))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage == 0.0
        assert result.diff_pixel_count == 0


class TestDifferentInputs:
    def test_completely_different_images(self):
        png_a = _make_png(100, 100, (0, 0, 0))
        png_b = _make_png(100, 100, (255, 255, 255))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage == 100.0
        assert result.diff_pixel_count == 10000

    def test_half_different(self):
        png_a = _make_png(100, 100, (0, 0, 0))
        png_b = _make_two_color_png(100, 100)
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage > 0
        assert result.diff_percentage < 100

    def test_small_difference(self):
        png_a = _make_png(100, 100, (100, 100, 100))
        png_b = _make_png(100, 100, (100, 100, 101))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage == 0.0

    def test_threshold_respected(self):
        png_a = _make_png(100, 100, (0, 0, 0))
        png_b = _make_png(100, 100, (9, 9, 9))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage == 0.0

    def test_just_above_threshold(self):
        png_a = _make_png(100, 100, (0, 0, 0))
        png_b = _make_png(100, 100, (11, 11, 11))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.diff_percentage == 100.0


class TestSizeNormalization:
    def test_different_sizes_are_normalized(self):
        png_a = _make_png(50, 100, (255, 255, 255))
        png_b = _make_png(100, 50, (255, 255, 255))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.width_a == 50
        assert result.height_a == 100
        assert result.width_b == 100
        assert result.height_b == 50
        assert result.total_pixels == 100 * 100

    def test_different_sizes_with_same_white_fill(self):
        png_a = _make_png(30, 30, (0, 0, 0))
        png_b = _make_png(100, 100, (0, 0, 0))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert result.total_pixels == 10000
        assert result.diff_percentage > 0


class TestOutputFiles:
    def test_diff_image_generated_when_both_have_data(self):
        png_a = _make_png(50, 50, (0, 0, 0))
        png_b = _make_png(50, 50, (255, 255, 255))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        assert diff is not None
        assert len(diff) > 0
        assert hl_a is not None
        assert hl_b is not None

    def test_outputs_are_valid_png(self):
        png_a = _make_png(50, 50, (0, 0, 0))
        png_b = _make_png(50, 50, (255, 255, 255))
        result, diff, hl_a, hl_b = compare_visual(png_a, png_b)
        Image.open(io.BytesIO(diff))
        Image.open(io.BytesIO(hl_a))
        Image.open(io.BytesIO(hl_b))

    def test_no_files_when_one_input_none(self):
        png = _make_png()
        result, diff, hl_a, hl_b = compare_visual(png, None)
        assert diff is None
        assert hl_a is None
        assert hl_b is None


class TestInvalidInputs:
    def test_invalid_bytes_handled_gracefully(self):
        result, diff, hl_a, hl_b = compare_visual(b"not an image", b"also not")
        assert result.diff_percentage == 0.0
        assert diff is None

    def test_empty_bytes_handled_gracefully(self):
        result, diff, hl_a, hl_b = compare_visual(b"", b"")
        assert result.diff_percentage == 0.0


class TestDiffRegions:
    def test_diff_regions_populated(self):
        png_a = _make_png(100, 100, (0, 0, 0))
        png_b = _make_png(100, 100, (255, 255, 255))
        result, _, _, _ = compare_visual(png_a, png_b)
        assert len(result.diff_regions) > 0
        assert result.diff_regions[0].diff_pixel_count > 0

    def test_diff_ratio_in_range(self):
        png_a = _make_png(100, 100, (0, 0, 0))
        png_b = _make_two_color_png(100, 100)
        result, _, _, _ = compare_visual(png_a, png_b)
        for region in result.diff_regions:
            assert 0 <= region.diff_ratio <= 100

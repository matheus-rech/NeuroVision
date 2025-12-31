"""
Tests for NeuroVision Segmentation Module

Run with:
    pytest tests/test_segmentation.py -v
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add src to path for testing
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from neurovision.vision.segmentation import (
    NeuroimagingSegmenter,
    SegmentationResult,
)


class TestNeuroimagingSegmenter:
    """Tests for NeuroimagingSegmenter class."""
    
    @pytest.fixture
    def segmenter_or(self):
        """Create OR camera segmenter."""
        return NeuroimagingSegmenter(modality="OR_CAMERA")
    
    @pytest.fixture
    def segmenter_usg(self):
        """Create ultrasound segmenter."""
        return NeuroimagingSegmenter(modality="USG")
    
    @pytest.fixture
    def sample_color_frame(self):
        """Create sample color frame."""
        return np.random.randint(80, 180, (480, 640, 3), dtype=np.uint8)
    
    @pytest.fixture
    def sample_gray_frame(self):
        """Create sample grayscale frame."""
        return np.random.randint(50, 150, (480, 640), dtype=np.uint8)
    
    def test_init_default_modality(self):
        """Test default modality is OR_CAMERA."""
        segmenter = NeuroimagingSegmenter()
        assert segmenter.modality == "OR_CAMERA"
    
    def test_init_custom_modality(self):
        """Test custom modality initialization."""
        segmenter = NeuroimagingSegmenter(modality="USG")
        assert segmenter.modality == "USG"
    
    def test_thresholds_loaded(self, segmenter_or):
        """Test thresholds are loaded for modality."""
        assert "tumor" in segmenter_or.thresholds
        assert "blood" in segmenter_or.thresholds
    
    def test_colors_defined(self, segmenter_or):
        """Test colors are defined."""
        assert "tumor" in segmenter_or.COLORS
        assert len(segmenter_or.COLORS["tumor"]) == 3
    
    def test_preprocess_color(self, segmenter_or, sample_color_frame):
        """Test preprocessing color images."""
        gray, blurred = segmenter_or.preprocess(sample_color_frame)
        
        assert gray.shape == (480, 640)
        assert blurred.shape == (480, 640)
        assert gray.dtype == np.uint8
    
    def test_preprocess_grayscale(self, segmenter_usg, sample_gray_frame):
        """Test preprocessing grayscale images."""
        gray, blurred = segmenter_usg.preprocess(sample_gray_frame)
        
        assert gray.shape == sample_gray_frame.shape
        assert blurred.shape == sample_gray_frame.shape
    
    def test_create_roi_mask(self, segmenter_or, sample_gray_frame):
        """Test ROI mask creation."""
        _, blurred = segmenter_or.preprocess(sample_gray_frame)
        roi = segmenter_or.create_roi_mask(blurred)
        
        assert roi.shape == blurred.shape
        assert roi.dtype == np.uint8
        assert set(np.unique(roi)).issubset({0, 255})
    
    def test_segment_all_returns_dict(self, segmenter_or, sample_color_frame):
        """Test segment_all returns dictionary."""
        masks = segmenter_or.segment_all(sample_color_frame)
        
        assert isinstance(masks, dict)
        assert all(isinstance(v, np.ndarray) for v in masks.values())
    
    def test_segment_all_has_expected_structures(self, segmenter_or, sample_color_frame):
        """Test expected structures are in result."""
        masks = segmenter_or.segment_all(sample_color_frame)
        
        expected = {"tumor", "blood", "tissue", "instrument"}
        assert expected == set(masks.keys())
    
    def test_segment_all_usg_structures(self, segmenter_usg, sample_gray_frame):
        """Test USG modality has correct structures."""
        masks = segmenter_usg.segment_all(sample_gray_frame)
        
        expected = {"tumor", "csf", "parenchyma"}
        assert expected == set(masks.keys())
    
    def test_masks_are_binary(self, segmenter_or, sample_color_frame):
        """Test masks contain only 0 and 255."""
        masks = segmenter_or.segment_all(sample_color_frame)
        
        for name, mask in masks.items():
            unique_values = set(np.unique(mask))
            assert unique_values.issubset({0, 255}), f"{name} mask not binary"
    
    def test_segment_and_analyze(self, segmenter_or, sample_color_frame):
        """Test segment_and_analyze returns SegmentationResult."""
        result = segmenter_or.segment_and_analyze(sample_color_frame)
        
        assert isinstance(result, SegmentationResult)
        assert result.modality == "OR_CAMERA"
        assert result.processing_time_ms > 0
    
    def test_analyze_masks(self, segmenter_or, sample_color_frame):
        """Test mask analysis statistics."""
        masks = segmenter_or.segment_all(sample_color_frame)
        stats = segmenter_or.analyze_masks(masks)
        
        assert isinstance(stats, dict)
        for name, info in stats.items():
            assert "region_count" in info
            assert "total_area" in info
            assert "regions" in info
    
    def test_create_overlay(self, segmenter_or, sample_color_frame):
        """Test overlay creation."""
        masks = segmenter_or.segment_all(sample_color_frame)
        overlay = segmenter_or.create_overlay(sample_color_frame, masks)
        
        assert overlay.shape == sample_color_frame.shape
        assert overlay.dtype == np.uint8


class TestSegmentationResult:
    """Tests for SegmentationResult dataclass."""
    
    @pytest.fixture
    def sample_result(self):
        """Create sample result."""
        masks = {
            "tumor": np.zeros((100, 100), dtype=np.uint8),
            "csf": np.zeros((100, 100), dtype=np.uint8),
        }
        masks["tumor"][40:60, 40:60] = 255  # 400 pixels
        
        return SegmentationResult(
            masks=masks,
            stats={
                "tumor": {
                    "region_count": 1,
                    "total_area": 400,
                    "regions": [{"centroid": (50, 50), "area": 400}]
                },
                "csf": {
                    "region_count": 0,
                    "total_area": 0,
                    "regions": []
                }
            },
            processing_time_ms=25.0,
            modality="USG"
        )
    
    def test_get_structure_area(self, sample_result):
        """Test getting structure area."""
        area = sample_result.get_structure_area("tumor")
        assert area == 400
    
    def test_get_structure_area_missing(self, sample_result):
        """Test getting area for missing structure."""
        area = sample_result.get_structure_area("nonexistent")
        assert area is None
    
    def test_get_structure_centroid(self, sample_result):
        """Test getting structure centroid."""
        centroid = sample_result.get_structure_centroid("tumor")
        assert centroid == (50, 50)
    
    def test_to_dict(self, sample_result):
        """Test conversion to dictionary."""
        d = sample_result.to_dict()
        
        assert d["modality"] == "USG"
        assert d["processing_time_ms"] == 25.0
        assert "tumor" in d["structures"]


class TestProximityDetection:
    """Tests for proximity calculation."""
    
    def test_calculate_proximity_basic(self):
        """Test basic proximity calculation."""
        segmenter = NeuroimagingSegmenter()
        
        # Create masks with known distance
        masks = {
            "tumor": np.zeros((100, 100), dtype=np.uint8),
            "instrument": np.zeros((100, 100), dtype=np.uint8),
        }
        
        # Tumor at (20, 20)
        masks["tumor"][15:25, 15:25] = 255
        
        # Instrument at (50, 20) - should be ~25 pixels away
        masks["instrument"][15:25, 45:55] = 255
        
        distance = segmenter.calculate_proximity(masks, "tumor", "instrument")
        
        assert distance is not None
        assert 20 < distance < 30  # Approximately 25 pixels
    
    def test_calculate_proximity_missing_structure(self):
        """Test proximity with missing structure."""
        segmenter = NeuroimagingSegmenter()
        
        masks = {
            "tumor": np.zeros((100, 100), dtype=np.uint8),
        }
        masks["tumor"][40:60, 40:60] = 255
        
        distance = segmenter.calculate_proximity(masks, "tumor", "instrument")
        assert distance is None
    
    def test_calculate_proximity_empty_mask(self):
        """Test proximity with empty mask."""
        segmenter = NeuroimagingSegmenter()
        
        masks = {
            "tumor": np.zeros((100, 100), dtype=np.uint8),
            "instrument": np.zeros((100, 100), dtype=np.uint8),
        }
        # tumor has pixels, instrument is empty
        masks["tumor"][40:60, 40:60] = 255
        
        distance = segmenter.calculate_proximity(masks, "tumor", "instrument")
        assert distance is None


@pytest.mark.parametrize("modality", ["USG", "OR_CAMERA", "T1_GD", "T2", "FLAIR"])
def test_all_modalities_work(modality):
    """Test segmentation works for all modalities."""
    segmenter = NeuroimagingSegmenter(modality=modality)
    frame = np.random.randint(0, 255, (240, 320), dtype=np.uint8)
    
    masks = segmenter.segment_all(frame)
    
    assert len(masks) > 0
    assert all(isinstance(m, np.ndarray) for m in masks.values())


def test_performance():
    """Test segmentation meets performance requirements."""
    segmenter = NeuroimagingSegmenter(modality="OR_CAMERA")
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    
    # Run multiple times to get average
    times = []
    for _ in range(10):
        result = segmenter.segment_and_analyze(frame)
        times.append(result.processing_time_ms)
    
    avg_time = sum(times) / len(times)
    
    # Should be under 50ms for real-time performance
    assert avg_time < 50, f"Segmentation too slow: {avg_time:.1f}ms average"

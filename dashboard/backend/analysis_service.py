#!/usr/bin/env python3
"""
ARIA Analysis Service
=====================

NeuroVision analysis integration for the Surgical Command Center.
Wraps the existing NeuroimagingSegmenter and ClaudeVisionAnalyzer
for real-time surgical scene understanding.

Features:
- Physics-based segmentation (offline, <50ms)
- Claude Vision API integration (~500ms)
- Safety score computation
- Structure detection with spatial awareness
- Trajectory validation against critical structures
"""

import asyncio
import json
import time
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import numpy as np

# Add parent src to path for importing NeuroVision modules
DASHBOARD_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(DASHBOARD_ROOT))

try:
    from src.vision import (
        NeuroimagingSegmenter,
        ClaudeVisionAnalyzer,
        AnalysisMode,
        FrameAnalysis
    )
    NEUROVISION_AVAILABLE = True
except ImportError:
    NEUROVISION_AVAILABLE = False
    print("[AnalysisService] Warning: NeuroVision modules not available")


class AnalysisType(Enum):
    """Types of analysis that can be performed."""
    SEGMENTATION_ONLY = "segmentation"      # Fast, offline
    CLAUDE_VISION = "claude_vision"          # Full AI analysis
    HYBRID = "hybrid"                        # Segmentation + Claude
    SAFETY_CHECK = "safety_check"            # Safety-focused analysis
    NAVIGATION = "navigation"                # Structure/trajectory analysis


@dataclass
class StructureDetection:
    """Detected anatomical or surgical structure."""
    name: str
    structure_type: str  # tumor, vessel, nerve, instrument, etc.
    centroid: Tuple[int, int]
    bounding_box: Tuple[int, int, int, int]  # x, y, w, h
    area: int
    confidence: float
    is_critical: bool = False
    safety_margin_mm: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalysisResult:
    """Complete analysis result for a frame."""
    frame_id: int
    timestamp: datetime
    processing_time_ms: float
    analysis_type: AnalysisType

    # Scores
    safety_score: float = 100.0
    technique_score: Optional[float] = None

    # Detections
    structures: List[StructureDetection] = field(default_factory=list)
    instruments: List[Dict[str, Any]] = field(default_factory=list)
    alerts: List[Dict[str, Any]] = field(default_factory=list)

    # Guidance
    guidance: Optional[str] = None
    voice_alert: Optional[str] = None

    # Segmentation data
    segmentation_masks: Optional[Dict[str, Any]] = None

    # Raw data
    raw_analysis: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dictionary."""
        return {
            "frame_id": self.frame_id,
            "timestamp": self.timestamp.isoformat(),
            "processing_time_ms": round(self.processing_time_ms, 2),
            "analysis_type": self.analysis_type.value,
            "safety_score": round(self.safety_score, 1),
            "technique_score": round(self.technique_score, 1) if self.technique_score else None,
            "structures": [
                {
                    "name": s.name,
                    "type": s.structure_type,
                    "centroid": s.centroid,
                    "bounding_box": s.bounding_box,
                    "area": s.area,
                    "confidence": round(s.confidence, 2),
                    "is_critical": s.is_critical,
                    "safety_margin_mm": s.safety_margin_mm,
                    "metadata": s.metadata
                }
                for s in self.structures
            ],
            "instruments": self.instruments,
            "alerts": self.alerts,
            "guidance": self.guidance,
            "voice_alert": self.voice_alert
        }


class AnalysisService:
    """
    Analysis service integrating NeuroVision capabilities.

    Provides both fast offline segmentation and full Claude Vision
    analysis with caching and throttling support.
    """

    # Analysis modes mapping
    MODE_MAP = {
        AnalysisType.SAFETY_CHECK: AnalysisMode.OR_SAFETY if NEUROVISION_AVAILABLE else None,
        AnalysisType.NAVIGATION: AnalysisMode.NAVIGATION if NEUROVISION_AVAILABLE else None,
        AnalysisType.CLAUDE_VISION: AnalysisMode.FULL if NEUROVISION_AVAILABLE else None,
    }

    def __init__(
        self,
        modality: str = "OR_CAMERA",
        claude_api_key: Optional[str] = None,
        claude_analysis_interval: float = 0.5  # Seconds between Claude calls
    ):
        self.modality = modality
        self.claude_analysis_interval = claude_analysis_interval

        # Initialize segmenter (always available, no API needed)
        if NEUROVISION_AVAILABLE:
            self.segmenter = NeuroimagingSegmenter(modality=modality)
        else:
            self.segmenter = None
            print("[AnalysisService] Warning: Segmenter not available")

        # Initialize Claude analyzer (optional, requires API key)
        self.claude_analyzer = None
        if NEUROVISION_AVAILABLE and claude_api_key:
            try:
                self.claude_analyzer = ClaudeVisionAnalyzer(api_key=claude_api_key)
                print("[AnalysisService] Claude Vision analyzer initialized")
            except Exception as e:
                print(f"[AnalysisService] Warning: Claude analyzer init failed: {e}")

        # Caching
        self._last_claude_analysis: Optional[Dict] = None
        self._last_claude_time: float = 0
        self._analysis_count = 0

    async def analyze_frame(
        self,
        frame: np.ndarray,
        frame_id: int,
        analysis_type: AnalysisType = AnalysisType.HYBRID,
        force_claude: bool = False
    ) -> AnalysisResult:
        """
        Analyze a camera frame.

        Args:
            frame: OpenCV BGR frame (numpy array)
            frame_id: Unique frame identifier
            analysis_type: Type of analysis to perform
            force_claude: Force Claude analysis regardless of throttling

        Returns:
            AnalysisResult with all detections and scores
        """
        start_time = time.time()
        timestamp = datetime.now()

        structures: List[StructureDetection] = []
        instruments: List[Dict] = []
        alerts: List[Dict] = []
        guidance = None
        voice_alert = None
        safety_score = 100.0
        technique_score = None
        raw_analysis = None
        segmentation_masks = None

        # Run local segmentation (fast, always available)
        if self.segmenter and analysis_type in (
            AnalysisType.SEGMENTATION_ONLY,
            AnalysisType.HYBRID,
            AnalysisType.NAVIGATION
        ):
            try:
                masks = self.segmenter.segment_all(frame)
                contours_data = self.segmenter.get_contours_and_centroids(masks)

                # Convert to StructureDetection objects
                for structure_name, instances in contours_data.items():
                    for instance in instances:
                        structures.append(StructureDetection(
                            name=structure_name,
                            structure_type=self._classify_structure(structure_name),
                            centroid=instance["centroid"],
                            bounding_box=instance["bounding_box"],
                            area=instance["area"],
                            confidence=0.85,  # Segmentation confidence
                            is_critical=structure_name in ("blood", "vessels"),
                            metadata={"source": "segmentation"}
                        ))

                segmentation_masks = {
                    k: v.tolist() if hasattr(v, 'tolist') else v
                    for k, v in masks.items()
                }
            except Exception as e:
                print(f"[AnalysisService] Segmentation error: {e}")

        # Run Claude Vision analysis (slower, requires API)
        current_time = time.time()
        should_run_claude = (
            self.claude_analyzer and
            analysis_type in (AnalysisType.CLAUDE_VISION, AnalysisType.HYBRID, AnalysisType.SAFETY_CHECK) and
            (force_claude or (current_time - self._last_claude_time) >= self.claude_analysis_interval)
        )

        if should_run_claude:
            try:
                mode = self.MODE_MAP.get(analysis_type, AnalysisMode.FULL)
                claude_result = await self.claude_analyzer.analyze_frame(frame, mode)
                self._last_claude_analysis = claude_result
                self._last_claude_time = current_time

                raw_analysis = claude_result

                # Extract data from Claude response
                if "error" not in claude_result:
                    safety_score = self._extract_safety_score(claude_result)
                    technique_score = self._extract_technique_score(claude_result)
                    instruments = self._extract_instruments(claude_result)
                    alerts = self._extract_alerts(claude_result)
                    guidance = claude_result.get("guidance") or claude_result.get("real_time_feedback")
                    voice_alert = claude_result.get("voice_alert") or claude_result.get("voice_feedback")

                    # Add Claude-detected structures
                    claude_structures = self._extract_structures(claude_result)
                    structures.extend(claude_structures)

            except Exception as e:
                print(f"[AnalysisService] Claude analysis error: {e}")
                # Fall back to cached analysis
                if self._last_claude_analysis:
                    raw_analysis = self._last_claude_analysis

        # Use cached Claude analysis if available and we didn't run new one
        elif self._last_claude_analysis and analysis_type != AnalysisType.SEGMENTATION_ONLY:
            raw_analysis = self._last_claude_analysis
            safety_score = self._extract_safety_score(self._last_claude_analysis)
            voice_alert = self._last_claude_analysis.get("voice_alert")

        # Calculate safety score from structures if not from Claude
        if not raw_analysis:
            safety_score = self._calculate_safety_score(structures)

        processing_time = (time.time() - start_time) * 1000
        self._analysis_count += 1

        return AnalysisResult(
            frame_id=frame_id,
            timestamp=timestamp,
            processing_time_ms=processing_time,
            analysis_type=analysis_type,
            safety_score=safety_score,
            technique_score=technique_score,
            structures=structures,
            instruments=instruments,
            alerts=alerts,
            guidance=guidance,
            voice_alert=voice_alert,
            segmentation_masks=segmentation_masks,
            raw_analysis=raw_analysis
        )

    def _classify_structure(self, name: str) -> str:
        """Classify structure type from name."""
        classifications = {
            "tumor": "pathology",
            "blood": "vessel",
            "tissue": "parenchyma",
            "instrument": "instrument",
            "csf": "csf_space",
            "enhancement": "pathology",
            "edema": "pathology",
            "parenchyma": "parenchyma",
            "necrotic": "pathology"
        }
        return classifications.get(name.lower(), "other")

    def _extract_safety_score(self, analysis: Dict) -> float:
        """Extract safety score from Claude analysis."""
        if "safety_score" in analysis:
            return float(analysis["safety_score"])
        if "safety" in analysis and "safety_score" in analysis["safety"]:
            return float(analysis["safety"]["safety_score"])
        return 100.0

    def _extract_technique_score(self, analysis: Dict) -> Optional[float]:
        """Extract technique score from Claude analysis."""
        if "overall_score" in analysis:
            return float(analysis["overall_score"])
        if "technique" in analysis and "quality_score" in analysis["technique"]:
            return float(analysis["technique"]["quality_score"])
        return None

    def _extract_instruments(self, analysis: Dict) -> List[Dict]:
        """Extract instrument detections from Claude analysis."""
        instruments = []

        for key in ["instruments", "instruments_visible", "instruments_detected"]:
            if key in analysis:
                items = analysis[key]
                if isinstance(items, list):
                    instruments.extend(items)
                elif isinstance(items, dict) and "identified" in items:
                    instruments.extend(items["identified"])

        return instruments

    def _extract_alerts(self, analysis: Dict) -> List[Dict]:
        """Extract alerts from Claude analysis."""
        alerts = []

        for key in ["alerts", "critical_alerts", "warnings", "proximity_warnings"]:
            if key in analysis:
                items = analysis[key]
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, str):
                            alerts.append({"message": item, "severity": "warning"})
                        else:
                            alerts.append(item)

        return alerts

    def _extract_structures(self, analysis: Dict) -> List[StructureDetection]:
        """Extract structure detections from Claude analysis."""
        structures = []

        for key in ["structures_identified", "structures", "regions"]:
            if key in analysis:
                for item in analysis[key]:
                    if isinstance(item, dict):
                        # Parse bounding box if available
                        bbox = item.get("bounding_box", [0, 0, 100, 100])
                        if len(bbox) == 4:
                            # Convert percentage to pixels (assume 1000x1000 normalized)
                            x, y = int(bbox[0] * 10), int(bbox[1] * 10)
                            w, h = int((bbox[2] - bbox[0]) * 10), int((bbox[3] - bbox[1]) * 10)
                        else:
                            x, y, w, h = 0, 0, 100, 100

                        structures.append(StructureDetection(
                            name=item.get("name", "unknown"),
                            structure_type=item.get("type", "other"),
                            centroid=(x + w // 2, y + h // 2),
                            bounding_box=(x, y, w, h),
                            area=w * h,
                            confidence=item.get("confidence", 0.5),
                            is_critical=item.get("safety_critical", False),
                            safety_margin_mm=item.get("safety_margin_mm"),
                            metadata={"source": "claude_vision"}
                        ))

        # Check anatomy section
        if "anatomy" in analysis and "structures" in analysis["anatomy"]:
            for item in analysis["anatomy"]["structures"]:
                if isinstance(item, dict):
                    structures.append(StructureDetection(
                        name=item.get("name", "unknown"),
                        structure_type=item.get("type", "anatomy"),
                        centroid=(0, 0),
                        bounding_box=(0, 0, 0, 0),
                        area=0,
                        confidence=item.get("confidence", 0.5),
                        is_critical=item.get("safety_critical", False),
                        metadata={"source": "claude_vision"}
                    ))

        return structures

    def _calculate_safety_score(self, structures: List[StructureDetection]) -> float:
        """Calculate safety score from detected structures."""
        score = 100.0

        for structure in structures:
            if structure.is_critical:
                # Reduce score based on proximity/size of critical structures
                score -= min(20, structure.area / 1000)

            if structure.structure_type == "pathology":
                score -= 5

        return max(0, min(100, score))

    def validate_trajectory(
        self,
        trajectory: List[Tuple[int, int]],
        structures: List[StructureDetection],
        safety_margin_px: int = 50
    ) -> Dict[str, Any]:
        """
        Validate a surgical trajectory against detected structures.

        Args:
            trajectory: List of (x, y) points defining the trajectory
            structures: List of detected structures
            safety_margin_px: Minimum safe distance from critical structures

        Returns:
            Validation result with warnings and recommendations
        """
        warnings = []
        is_safe = True
        min_distance_to_critical = float('inf')

        for point in trajectory:
            for structure in structures:
                if structure.is_critical:
                    # Calculate distance to structure centroid
                    dist = np.sqrt(
                        (point[0] - structure.centroid[0])**2 +
                        (point[1] - structure.centroid[1])**2
                    )

                    min_distance_to_critical = min(min_distance_to_critical, dist)

                    if dist < safety_margin_px:
                        is_safe = False
                        warnings.append({
                            "structure": structure.name,
                            "distance_px": int(dist),
                            "point": point,
                            "severity": "critical" if dist < safety_margin_px / 2 else "warning"
                        })

        return {
            "is_safe": is_safe,
            "min_distance_to_critical_px": int(min_distance_to_critical) if min_distance_to_critical != float('inf') else None,
            "warnings": warnings,
            "recommendation": "Clear trajectory" if is_safe else "Adjust trajectory to avoid critical structures"
        }

    def get_status(self) -> Dict[str, Any]:
        """Get analysis service status."""
        return {
            "neurovision_available": NEUROVISION_AVAILABLE,
            "segmenter_available": self.segmenter is not None,
            "claude_available": self.claude_analyzer is not None,
            "modality": self.modality,
            "analysis_count": self._analysis_count,
            "claude_interval_seconds": self.claude_analysis_interval,
            "last_claude_analysis_age": time.time() - self._last_claude_time if self._last_claude_time else None
        }


# Singleton instance
_analysis_instance: Optional[AnalysisService] = None


def get_analysis_service() -> AnalysisService:
    """Get or create the global analysis service instance."""
    global _analysis_instance
    if _analysis_instance is None:
        import os
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        _analysis_instance = AnalysisService(claude_api_key=api_key)
    return _analysis_instance


def init_analysis_service(
    modality: str = "OR_CAMERA",
    claude_api_key: Optional[str] = None,
    **kwargs
) -> AnalysisService:
    """Initialize the global analysis service with specific settings."""
    global _analysis_instance
    _analysis_instance = AnalysisService(
        modality=modality,
        claude_api_key=claude_api_key,
        **kwargs
    )
    return _analysis_instance

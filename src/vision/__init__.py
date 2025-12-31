"""
NeuroVision Vision Module
=========================

Real-time camera capture and vision analysis for neurosurgical applications.

Components:
-----------
- CameraCapture: OpenCV-based camera handling with threading
- ClaudeVisionAnalyzer: Claude API integration for intelligent analysis
- NeuroimagingSegmenter: Physics-based threshold segmentation
- RealTimeVisionSystem: Orchestrates all vision components

Supported Modalities:
--------------------
- USG: Brain ultrasound (intraoperative neuroUSG)
- T1_GD: MRI T1 with gadolinium contrast
- OR_CAMERA: Surgical microscope/endoscope view

Example:
--------
>>> from neurovision.vision import NeuroimagingSegmenter
>>> import cv2
>>> 
>>> frame = cv2.imread("brain_usg.png")
>>> segmenter = NeuroimagingSegmenter(modality="USG")
>>> masks = segmenter.segment_all(frame)
>>> overlay = segmenter.create_overlay(frame, masks)
"""

from .camera_vision_system import (
    CameraCapture,
    CameraSource,
    ClaudeVisionAnalyzer,
    NeuroimagingSegmenter,
    RealTimeVisionSystem,
    AnalysisMode,
    FrameAnalysis,
    analyze_image,
    run_webcam_analysis,
    run_local_segmentation_only,
)

__all__ = [
    "CameraCapture",
    "CameraSource",
    "ClaudeVisionAnalyzer",
    "NeuroimagingSegmenter",
    "RealTimeVisionSystem",
    "AnalysisMode",
    "FrameAnalysis",
    "analyze_image",
    "run_webcam_analysis",
    "run_local_segmentation_only",
]

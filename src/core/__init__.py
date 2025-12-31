"""
NeuroVision - Real-time AI-powered neurosurgical vision system
==============================================================

A comprehensive platform for neurosurgical applications combining:
- Real-time camera capture and processing
- Claude Vision API integration for intelligent analysis
- Physics-based segmentation for structure detection
- Surgical robotics integration
- Training and assessment tools

Quick Start:
-----------
>>> from neurovision import RealTimeVisionSystem, AnalysisMode
>>> 
>>> system = RealTimeVisionSystem(
...     camera_source=CameraSource.WEBCAM,
...     analysis_mode=AnalysisMode.FULL
... )
>>> 
>>> async for result in system.analyze_stream():
...     print(f"Safety: {result.safety_score}")
...     if result.voice_alert:
...         speak(result.voice_alert)

Modules:
--------
- vision: Camera capture, Claude integration, segmentation
- robotics: Trajectory planning, robot control, safety corridors
- training: Procedure libraries, assessment, feedback
- core: Platform integration, utilities

Author: Dr. Matheus Machado Rech, M.D.
License: MIT
"""

__version__ = "0.1.0"
__author__ = "Dr. Matheus Machado Rech"
__email__ = "matheus@neurovision.ai"
__license__ = "MIT"

# Core imports
from .core.neurosurgical_ai_platform import (
    ORSafetyMonitor,
    SurgicalTrainingSystem,
    IntraoperativeNavigationAssistant,
)

# Vision imports
from .vision.camera_vision_system import (
    RealTimeVisionSystem,
    CameraCapture,
    CameraSource,
    AnalysisMode,
    ClaudeVisionAnalyzer,
    NeuroimagingSegmenter,
    FrameAnalysis,
)

# Robotics imports
from .robotics.neurosurgical_robotics_ai import (
    SurgicalRoboticsFramework,
    TrajectoryPlanner,
    SafetyCorridor,
    RobotController,
)

__all__ = [
    # Version info
    "__version__",
    "__author__",
    
    # Vision
    "RealTimeVisionSystem",
    "CameraCapture",
    "CameraSource",
    "AnalysisMode",
    "ClaudeVisionAnalyzer",
    "NeuroimagingSegmenter",
    "FrameAnalysis",
    
    # Core
    "ORSafetyMonitor",
    "SurgicalTrainingSystem",
    "IntraoperativeNavigationAssistant",
    
    # Robotics
    "SurgicalRoboticsFramework",
    "TrajectoryPlanner",
    "SafetyCorridor",
    "RobotController",
]

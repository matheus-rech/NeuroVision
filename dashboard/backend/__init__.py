"""
ARIA Surgical Command Center - Backend Module
==============================================

Real-time surgical dashboard backend with AI-powered analysis and voice alerts.

Components:
-----------
- main: FastAPI WebSocket server
- camera_service: OpenCV camera capture with frame queue
- analysis_service: NeuroVision integration for surgical scene analysis
- voice_service: ElevenLabs + pyttsx3 voice alert system

Usage:
------
    # Start the server
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

    # Or run directly
    python main.py
"""

from .camera_service import (
    CameraService,
    CameraSourceType,
    CapturedFrame,
    get_camera_service,
    init_camera_service
)

from .analysis_service import (
    AnalysisService,
    AnalysisType,
    AnalysisResult,
    StructureDetection,
    get_analysis_service,
    init_analysis_service
)

from .voice_service import (
    VoiceService,
    AlertPriority,
    SurgicalAlerts,
    get_voice_service,
    init_voice_service,
    speak_alert,
    speak_critical
)

__all__ = [
    # Camera
    "CameraService",
    "CameraSourceType",
    "CapturedFrame",
    "get_camera_service",
    "init_camera_service",
    # Analysis
    "AnalysisService",
    "AnalysisType",
    "AnalysisResult",
    "StructureDetection",
    "get_analysis_service",
    "init_analysis_service",
    # Voice
    "VoiceService",
    "AlertPriority",
    "SurgicalAlerts",
    "get_voice_service",
    "init_voice_service",
    "speak_alert",
    "speak_critical",
]

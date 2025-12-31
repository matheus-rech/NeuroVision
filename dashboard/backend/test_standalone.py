#!/usr/bin/env python3
"""
ARIA Backend Standalone Test
============================

Tests the backend components without requiring a full WebSocket connection.
Useful for verifying camera, analysis, and voice services work correctly.

Usage:
    python test_standalone.py
    python test_standalone.py --camera      # Test camera only
    python test_standalone.py --analysis    # Test analysis only
    python test_standalone.py --voice       # Test voice only
    python test_standalone.py --all         # Test all components
"""

import asyncio
import argparse
import time
import sys
import os

# Ensure we can import local modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from camera_service import CameraService, CameraSourceType
from analysis_service import AnalysisService, AnalysisType
from voice_service import VoiceService, AlertPriority, SurgicalAlerts


def test_camera(duration: float = 5.0):
    """Test camera service."""
    print("\n" + "="*60)
    print("TESTING CAMERA SERVICE")
    print("="*60)

    camera = CameraService(
        source_type=CameraSourceType.SYNTHETIC,
        target_fps=30
    )

    if not camera.start():
        print("FAILED: Could not start camera")
        return False

    print(f"Camera started: {camera.source_type.value}")
    print(f"Resolution: {camera.resolution}")
    print(f"Target FPS: {camera.target_fps}")

    # Capture frames for duration
    start = time.time()
    frames_received = 0

    while time.time() - start < duration:
        frame = camera.get_frame(timeout=0.1)
        if frame:
            frames_received += 1
            if frames_received % 30 == 0:
                print(f"  Frame {frame.frame_id}: {frame.width}x{frame.height}")

    camera.stop()

    status = camera.get_status()
    print(f"\nResults:")
    print(f"  Frames captured: {status['frame_count']}")
    print(f"  Frames received: {frames_received}")
    print(f"  Actual FPS: {status['actual_fps']:.1f}")
    print(f"  Dropped: {status['dropped_frames']}")

    print("\nCAMERA TEST: PASSED" if frames_received > 0 else "CAMERA TEST: FAILED")
    return frames_received > 0


async def test_analysis():
    """Test analysis service."""
    print("\n" + "="*60)
    print("TESTING ANALYSIS SERVICE")
    print("="*60)

    import numpy as np

    # Create synthetic frame
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    frame[:, :] = (30, 20, 60)  # Dark surgical background

    # Add some structures
    import cv2
    cv2.circle(frame, (640, 360), 100, (50, 50, 120), -1)  # Tumor-like
    cv2.circle(frame, (400, 300), 30, (0, 0, 200), -1)     # Vessel-like

    analyzer = AnalysisService(
        modality="OR_CAMERA",
        claude_api_key=os.environ.get("ANTHROPIC_API_KEY")
    )

    print(f"Analyzer status: {analyzer.get_status()}")

    # Test segmentation only (offline)
    print("\nTesting segmentation (offline)...")
    result = await analyzer.analyze_frame(
        frame=frame,
        frame_id=1,
        analysis_type=AnalysisType.SEGMENTATION_ONLY
    )

    print(f"  Processing time: {result.processing_time_ms:.1f}ms")
    print(f"  Structures found: {len(result.structures)}")
    print(f"  Safety score: {result.safety_score}")

    # Test hybrid if API key available
    if os.environ.get("ANTHROPIC_API_KEY"):
        print("\nTesting hybrid analysis (with Claude)...")
        result = await analyzer.analyze_frame(
            frame=frame,
            frame_id=2,
            analysis_type=AnalysisType.HYBRID,
            force_claude=True
        )
        print(f"  Processing time: {result.processing_time_ms:.1f}ms")
        print(f"  Structures found: {len(result.structures)}")
        print(f"  Safety score: {result.safety_score}")
        print(f"  Voice alert: {result.voice_alert}")
    else:
        print("\nSkipping Claude test (ANTHROPIC_API_KEY not set)")

    print("\nANALYSIS TEST: PASSED")
    return True


def test_voice():
    """Test voice service."""
    print("\n" + "="*60)
    print("TESTING VOICE SERVICE")
    print("="*60)

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    voice = VoiceService(
        elevenlabs_api_key=api_key,
        enable_fallback=True
    )

    status = voice.get_status()
    print(f"ElevenLabs available: {status['elevenlabs_available']}")
    print(f"pyttsx3 available: {status['pyttsx3_available']}")

    voice.start()

    # Test queuing
    print("\nTesting alert queue...")
    voice.queue_alert("Testing info alert", AlertPriority.INFO)
    voice.queue_alert("Testing warning alert", AlertPriority.WARNING)
    print(f"  Queue size: {voice.alert_queue.qsize()}")

    # Test throttling
    print("\nTesting throttling...")
    result1 = voice.queue_alert("Same message", AlertPriority.INFO)
    result2 = voice.queue_alert("Same message", AlertPriority.INFO)
    print(f"  First queue: {result1}")
    print(f"  Second queue (should be throttled): {result2}")

    # Test actual speech if available
    if status['elevenlabs_available'] or status['pyttsx3_available']:
        print("\nTesting speech output...")
        success = voice.speak_immediate("ARIA voice test. All systems operational.")
        print(f"  Speech result: {'Success' if success else 'Failed'}")
    else:
        print("\nSkipping speech test (no TTS available)")

    voice.stop()

    print("\nVOICE TEST: PASSED")
    return True


async def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("ARIA BACKEND STANDALONE TEST SUITE")
    print("="*60)

    results = {
        "camera": test_camera(duration=3.0),
        "analysis": await test_analysis(),
        "voice": test_voice()
    }

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for name, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        print(f"  {name.upper()}: {status}")

    all_passed = all(results.values())
    print("\n" + ("ALL TESTS PASSED" if all_passed else "SOME TESTS FAILED"))
    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Test ARIA backend components")
    parser.add_argument("--camera", action="store_true", help="Test camera only")
    parser.add_argument("--analysis", action="store_true", help="Test analysis only")
    parser.add_argument("--voice", action="store_true", help="Test voice only")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    args = parser.parse_args()

    # Default to all if no specific test selected
    if not any([args.camera, args.analysis, args.voice, args.all]):
        args.all = True

    if args.all:
        asyncio.run(run_all_tests())
    else:
        if args.camera:
            test_camera()
        if args.analysis:
            asyncio.run(test_analysis())
        if args.voice:
            test_voice()


if __name__ == "__main__":
    main()

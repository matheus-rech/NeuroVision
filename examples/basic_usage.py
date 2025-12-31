#!/usr/bin/env python3
"""
NeuroVision - Basic Usage Example

This example demonstrates the fundamental capabilities of NeuroVision:
1. Loading and segmenting an image
2. Analyzing detection results
3. Creating visualization overlays
4. Running real-time webcam analysis

Run with:
    python examples/basic_usage.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from neurovision import (
    NeuroimagingSegmenter,
    RealTimeVisionSystem,
    CameraSource,
    AnalysisMode,
)


def example_single_image():
    """Example: Segment a single image."""
    print("\n" + "=" * 60)
    print("Example 1: Single Image Segmentation")
    print("=" * 60)
    
    # Create segmenter for ultrasound modality
    segmenter = NeuroimagingSegmenter(modality="USG")
    
    print(f"\nSegmenter initialized for modality: {segmenter.modality}")
    print(f"Structures to detect: {list(segmenter.thresholds.keys())}")
    
    # For demo, create a simple test image
    import numpy as np
    
    # Create synthetic ultrasound-like image
    frame = np.zeros((480, 640), dtype=np.uint8)
    
    # Add background noise
    frame = np.random.randint(50, 100, (480, 640), dtype=np.uint8)
    
    # Add hyperechoic region (tumor)
    frame[200:280, 280:360] = 200
    
    # Add anechoic region (CSF/ventricle)
    frame[150:180, 150:200] = 20
    
    print("\nSegmenting synthetic ultrasound image...")
    
    # Segment all structures
    result = segmenter.segment_and_analyze(frame)
    
    print(f"\nProcessing time: {result.processing_time_ms:.1f}ms")
    print("\nDetected structures:")
    for name, stats in result.stats.items():
        if stats["region_count"] > 0:
            print(f"  - {name}: {stats['region_count']} region(s), "
                  f"{stats['total_area']:,} pixels total")


def example_modality_comparison():
    """Example: Compare segmentation across modalities."""
    print("\n" + "=" * 60)
    print("Example 2: Modality Comparison")
    print("=" * 60)
    
    modalities = ["USG", "OR_CAMERA", "T1_GD"]
    
    for modality in modalities:
        segmenter = NeuroimagingSegmenter(modality=modality)
        print(f"\n{modality} modality:")
        print(f"  Structures: {list(segmenter.thresholds.keys())}")
        for structure, (low, high) in segmenter.thresholds.items():
            print(f"    - {structure}: intensity range [{low}, {high}]")


def example_proximity_detection():
    """Example: Detect proximity between structures."""
    print("\n" + "=" * 60)
    print("Example 3: Proximity Detection")
    print("=" * 60)
    
    import numpy as np
    
    segmenter = NeuroimagingSegmenter(modality="OR_CAMERA")
    
    # Create image with two structures close together
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:, :] = (120, 100, 100)  # Background tissue
    
    # Add "tumor" region (bright)
    frame[200:260, 200:260] = (220, 200, 200)
    
    # Add "instrument" region (very bright, close to tumor)
    frame[200:240, 270:290] = (250, 250, 250)
    
    print("\nSegmenting image with instrument near tumor...")
    
    masks = segmenter.segment_all(frame)
    
    # Calculate proximity
    distance = segmenter.calculate_proximity(masks, "instrument", "tumor")
    
    if distance is not None:
        print(f"\nInstrument-to-tumor distance: {distance:.1f} pixels")
        if distance < 20:
            print("  WARNING: Instrument is very close to tumor!")
    else:
        print("\nCould not calculate proximity (structures not detected)")


async def example_streaming_analysis():
    """Example: Real-time streaming analysis (simulated)."""
    print("\n" + "=" * 60)
    print("Example 4: Streaming Analysis (Simulated)")
    print("=" * 60)
    
    print("\nNote: This would normally use a webcam.")
    print("For this demo, we'll simulate the streaming behavior.\n")
    
    # Simulate what streaming would look like
    import numpy as np
    
    segmenter = NeuroimagingSegmenter(modality="OR_CAMERA")
    
    for frame_id in range(5):
        # Simulate frame generation
        frame = np.random.randint(80, 180, (480, 640, 3), dtype=np.uint8)
        
        # Add simulated structures
        frame[200:260, 200:260] = (220, 200, 200)  # Tumor
        frame[150:170, 300:310] = (40, 40, 80)      # Blood
        
        # Segment
        result = segmenter.segment_and_analyze(frame)
        
        # Display results
        structures = [
            name for name, stats in result.stats.items() 
            if stats["region_count"] > 0
        ]
        
        print(f"Frame {frame_id + 1}: {result.processing_time_ms:.1f}ms | "
              f"Structures: {structures}")
    
    print("\n[Streaming complete]")


def example_real_webcam():
    """Example: Real webcam analysis (requires camera)."""
    print("\n" + "=" * 60)
    print("Example 5: Real Webcam Analysis")
    print("=" * 60)
    
    print("\nTo run real webcam analysis:")
    print("  python -m neurovision.vision.camera --webcam")
    print("\nOr in code:")
    print("""
    async def run_webcam():
        system = RealTimeVisionSystem(
            camera_source=CameraSource.WEBCAM,
            analysis_mode=AnalysisMode.FULL,
            use_claude=False,  # Set True with API key
            local_segmentation=True
        )
        
        async for result in system.analyze_stream(show_preview=True):
            if result.voice_alert:
                print(f"ALERT: {result.voice_alert}")
    
    asyncio.run(run_webcam())
    """)


def main():
    """Run all examples."""
    print("\n" + "#" * 60)
    print("#" + " " * 58 + "#")
    print("#" + "    NeuroVision - Basic Usage Examples".center(58) + "#")
    print("#" + " " * 58 + "#")
    print("#" * 60)
    
    # Run examples
    example_single_image()
    example_modality_comparison()
    example_proximity_detection()
    asyncio.run(example_streaming_analysis())
    example_real_webcam()
    
    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()

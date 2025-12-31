#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║           CLAUDE NEUROSURGICAL AI - REAL-TIME CAMERA VISION SYSTEM                                   ║
║                                                                                                      ║
║  ACTUAL camera integration with Claude's vision API for real-time surgical analysis.                 ║
║                                                                                                      ║
║  This is NOT a simulation - it uses:                                                                 ║
║    📹 OpenCV for real camera capture                                                                 ║
║    👁️ Claude Vision API for intelligent analysis                                                     ║
║    🧠 Neuroimaging segmentation for structure detection                                              ║
║    📡 Streaming output for low-latency feedback                                                      ║
║                                                                                                      ║
║  Supports:                                                                                           ║
║    - USB webcam / surgical cameras                                                                   ║
║    - IP cameras (RTSP streams)                                                                       ║
║    - Pre-recorded video files                                                                        ║
║    - Single image analysis                                                                           ║
║                                                                                                      ║
║  Author: Claude (Anthropic) for Dr. Matheus Machado Rech                                             ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝
"""

import cv2
import numpy as np
import base64
import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, AsyncIterator, Tuple, Callable
from enum import Enum
from datetime import datetime
from pathlib import Path
import threading
from queue import Queue
import os

# For Claude API
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("Warning: anthropic package not installed. Install with: pip install anthropic")


# =============================================================================
# CORE DATA STRUCTURES
# =============================================================================

class AnalysisMode(Enum):
    OR_SAFETY = "or_safety"           # Contamination, sterile field, personnel
    NAVIGATION = "navigation"          # Critical structures, trajectory, proximity
    TRAINING = "training"              # Technique assessment, step validation
    SEGMENTATION = "segmentation"      # Structure segmentation (tumor, vessels, etc.)
    INSTRUMENT = "instrument"          # Instrument identification and tracking
    FULL = "full"                      # All of the above


class CameraSource(Enum):
    WEBCAM = "webcam"
    IP_CAMERA = "ip_camera"
    VIDEO_FILE = "video_file"
    SINGLE_IMAGE = "single_image"


@dataclass
class FrameAnalysis:
    """Result of analyzing a single frame."""
    frame_id: int
    timestamp: datetime
    processing_time_ms: float
    mode: AnalysisMode
    
    # Detection results
    structures_detected: List[Dict] = field(default_factory=list)
    instruments_detected: List[Dict] = field(default_factory=list)
    alerts: List[Dict] = field(default_factory=list)
    
    # Segmentation masks (if requested)
    segmentation_masks: Optional[Dict[str, np.ndarray]] = None
    segmentation_overlay: Optional[np.ndarray] = None
    
    # Scores
    safety_score: float = 100.0
    technique_score: Optional[float] = None
    
    # Guidance
    guidance: Optional[str] = None
    voice_alert: Optional[str] = None
    
    # Raw response
    raw_analysis: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "frame_id": self.frame_id,
            "timestamp": self.timestamp.isoformat(),
            "processing_time_ms": self.processing_time_ms,
            "mode": self.mode.value,
            "structures_detected": self.structures_detected,
            "instruments_detected": self.instruments_detected,
            "alerts": self.alerts,
            "safety_score": self.safety_score,
            "technique_score": self.technique_score,
            "guidance": self.guidance,
            "voice_alert": self.voice_alert
        }


# =============================================================================
# CAMERA CAPTURE SYSTEM
# =============================================================================

class CameraCapture:
    """
    Handles camera capture from multiple sources with frame buffering.
    """
    
    def __init__(
        self,
        source: CameraSource = CameraSource.WEBCAM,
        source_path: str = "0",
        target_fps: int = 10,
        resolution: Tuple[int, int] = (1280, 720)
    ):
        self.source = source
        self.source_path = source_path
        self.target_fps = target_fps
        self.resolution = resolution
        
        self.cap = None
        self.is_running = False
        self.frame_queue = Queue(maxsize=30)
        self.capture_thread = None
        self.frame_count = 0
        
    def start(self) -> bool:
        """Start camera capture."""
        if self.source == CameraSource.WEBCAM:
            self.cap = cv2.VideoCapture(int(self.source_path))
        elif self.source == CameraSource.IP_CAMERA:
            self.cap = cv2.VideoCapture(self.source_path)
        elif self.source == CameraSource.VIDEO_FILE:
            self.cap = cv2.VideoCapture(self.source_path)
        elif self.source == CameraSource.SINGLE_IMAGE:
            return True  # No capture needed for single images
        
        if self.cap is None or not self.cap.isOpened():
            print(f"Error: Could not open camera source: {self.source_path}")
            return False
        
        # Set resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
        
        self.is_running = True
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        
        print(f"Camera started: {self.source.value} @ {self.resolution}")
        return True
    
    def _capture_loop(self):
        """Background thread for continuous frame capture."""
        frame_interval = 1.0 / self.target_fps
        
        while self.is_running:
            start_time = time.time()
            
            ret, frame = self.cap.read()
            if not ret:
                if self.source == CameraSource.VIDEO_FILE:
                    # Loop video
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    print("Warning: Failed to capture frame")
                    time.sleep(0.1)
                    continue
            
            self.frame_count += 1
            
            # Drop old frames if queue is full
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except:
                    pass
            
            self.frame_queue.put({
                "frame": frame,
                "frame_id": self.frame_count,
                "timestamp": datetime.now()
            })
            
            # Maintain target FPS
            elapsed = time.time() - start_time
            if elapsed < frame_interval:
                time.sleep(frame_interval - elapsed)
    
    def get_frame(self) -> Optional[Dict]:
        """Get the latest frame from the queue."""
        if self.source == CameraSource.SINGLE_IMAGE:
            frame = cv2.imread(self.source_path)
            if frame is not None:
                self.frame_count += 1
                return {
                    "frame": frame,
                    "frame_id": self.frame_count,
                    "timestamp": datetime.now()
                }
            return None
        
        try:
            return self.frame_queue.get_nowait()
        except:
            return None
    
    def stop(self):
        """Stop camera capture."""
        self.is_running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=2.0)
        if self.cap:
            self.cap.release()
        print("Camera stopped")


# =============================================================================
# IMAGE PROCESSING & SEGMENTATION
# =============================================================================

class NeuroimagingSegmenter:
    """
    Real segmentation using physics-based thresholding.
    Based on neuroimaging-segmentation skill.
    """
    
    # Standard color coding
    COLORS = {
        "tumor": (80, 80, 255),         # Red (BGR)
        "ventricles": (255, 150, 0),    # Blue
        "parenchyma": (100, 200, 100),  # Green
        "edema": (255, 150, 100),       # Light blue
        "enhancement": (0, 200, 255),   # Yellow
        "vessels": (0, 0, 255),         # Red
        "instrument": (255, 0, 255),    # Magenta
    }
    
    # Threshold ranges for different modalities
    THRESHOLDS = {
        "USG": {
            "tumor": (160, 255),        # Hyperechoic
            "csf": (0, 40),             # Anechoic
            "parenchyma": (50, 150),    # Isoechoic
        },
        "T1_GD": {
            "enhancement": (170, 255),
            "necrotic": (0, 45),
            "edema": (45, 85),
            "csf": (0, 35),
            "parenchyma": (85, 165),
        },
        "OR_CAMERA": {
            "blood": (0, 80),           # Dark red
            "tissue": (100, 200),       # Pink/red tissue
            "instrument": (200, 255),   # Metallic bright
        }
    }
    
    def __init__(self, modality: str = "OR_CAMERA"):
        self.modality = modality
        self.thresholds = self.THRESHOLDS.get(modality, self.THRESHOLDS["OR_CAMERA"])
    
    def preprocess(self, frame: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess frame for segmentation."""
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame
        
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        return gray, blurred
    
    def create_roi_mask(self, blurred: np.ndarray, threshold: int = 15) -> np.ndarray:
        """Create ROI mask to exclude background."""
        _, roi = cv2.threshold(blurred, threshold, 255, cv2.THRESH_BINARY)
        kernel = np.ones((10, 10), np.uint8)
        roi = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, kernel, iterations=3)
        return roi
    
    def segment_structure(
        self, 
        blurred: np.ndarray, 
        roi_mask: np.ndarray,
        structure: str,
        min_area: int = 300
    ) -> np.ndarray:
        """Segment a specific structure using thresholds."""
        if structure not in self.thresholds:
            return np.zeros_like(blurred)
        
        low, high = self.thresholds[structure]
        
        if low == 0:
            _, mask = cv2.threshold(blurred, high, 255, cv2.THRESH_BINARY_INV)
        else:
            mask = cv2.inRange(blurred, low, high)
        
        # Apply ROI
        mask = cv2.bitwise_and(mask, roi_mask)
        
        # Morphological cleanup
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Filter small regions
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filtered = np.zeros_like(mask)
        for cnt in contours:
            if cv2.contourArea(cnt) > min_area:
                cv2.drawContours(filtered, [cnt], -1, 255, -1)
        
        return filtered
    
    def segment_all(self, frame: np.ndarray) -> Dict[str, np.ndarray]:
        """Segment all structures in the frame."""
        gray, blurred = self.preprocess(frame)
        roi_mask = self.create_roi_mask(blurred)
        
        masks = {}
        for structure in self.thresholds.keys():
            masks[structure] = self.segment_structure(blurred, roi_mask, structure)
        
        return masks
    
    def create_overlay(
        self, 
        frame: np.ndarray, 
        masks: Dict[str, np.ndarray],
        alpha: float = 0.45
    ) -> np.ndarray:
        """Create visualization overlay with colored masks."""
        if len(frame.shape) == 2:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        else:
            frame_rgb = frame.copy()
        
        overlay = frame_rgb.copy()
        
        for structure, mask in masks.items():
            if structure in self.COLORS and np.any(mask > 0):
                color = self.COLORS[structure]
                overlay[mask > 0] = color
        
        result = cv2.addWeighted(overlay, alpha, frame_rgb, 1 - alpha, 0)
        return result
    
    def get_contours_and_centroids(
        self, 
        masks: Dict[str, np.ndarray]
    ) -> Dict[str, List[Dict]]:
        """Extract contours and centroids for each structure."""
        results = {}
        
        for structure, mask in masks.items():
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            structure_data = []
            for cnt in contours:
                M = cv2.moments(cnt)
                if M["m00"] > 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    area = cv2.contourArea(cnt)
                    x, y, w, h = cv2.boundingRect(cnt)
                    
                    structure_data.append({
                        "centroid": (cx, cy),
                        "area": area,
                        "bounding_box": (x, y, w, h),
                        "contour": cnt.tolist() if len(cnt) < 100 else cnt[::5].tolist()
                    })
            
            if structure_data:
                results[structure] = structure_data
        
        return results


# =============================================================================
# CLAUDE VISION ANALYZER
# =============================================================================

class ClaudeVisionAnalyzer:
    """
    Uses Claude's Vision API for intelligent surgical scene analysis.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError("anthropic package required. Install with: pip install anthropic")
        
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY required")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model = "claude-sonnet-4-20250514"  # Vision-capable model
        
        # Analysis prompts by mode
        self.prompts = self._build_prompts()
    
    def _build_prompts(self) -> Dict[AnalysisMode, str]:
        """Build analysis prompts for each mode."""
        return {
            AnalysisMode.OR_SAFETY: """Analyze this surgical/OR camera image for safety concerns.

Identify and report in JSON format:
{
    "sterile_field": {
        "status": "intact" or "compromised",
        "breaches": [{"description": "...", "location": "...", "severity": "critical/warning/caution"}]
    },
    "contamination_risks": [
        {"type": "...", "description": "...", "location": "...", "severity": "critical/warning/caution"}
    ],
    "instruments": [
        {"name": "...", "state": "sterile/contaminated/unknown", "location": "..."}
    ],
    "personnel": [
        {"role": "...", "scrubbed": true/false, "position_appropriate": true/false}
    ],
    "safety_score": 0-100,
    "critical_alerts": ["..."],
    "voice_alert": "short alert for TTS or null"
}

Focus on: sterile technique, contamination, instrument handling, personnel positioning.""",

            AnalysisMode.NAVIGATION: """Analyze this neurosurgical image for navigation assistance.

Identify anatomical structures and provide guidance in JSON format:
{
    "structures_identified": [
        {
            "name": "...",
            "type": "vessel/nerve/tumor/ventricle/parenchyma/bone/dura/other",
            "location": {"x": 0-100, "y": 0-100},
            "bounding_box": [x1, y1, x2, y2] as percentages,
            "confidence": 0.0-1.0,
            "safety_critical": true/false,
            "safety_margin_mm": number or null
        }
    ],
    "instruments_visible": [
        {"name": "...", "tip_location": {"x": ..., "y": ...}}
    ],
    "proximity_warnings": [
        {"instrument": "...", "structure": "...", "estimated_distance": "...", "severity": "critical/warning/safe"}
    ],
    "current_phase": "approach/resection/hemostasis/closure/other",
    "guidance": "Next step recommendation",
    "voice_alert": "short critical alert or null"
}

Focus on: critical structure identification, spatial relationships, safety margins.""",

            AnalysisMode.TRAINING: """Analyze this surgical image for training assessment.

Evaluate technique and provide feedback in JSON format:
{
    "current_action": "description of what is being performed",
    "technique_assessment": {
        "tissue_handling": {"score": 0-100, "feedback": "..."},
        "instrument_use": {"score": 0-100, "feedback": "..."},
        "efficiency": {"score": 0-100, "feedback": "..."},
        "safety": {"score": 0-100, "feedback": "..."}
    },
    "errors_detected": [
        {"type": "...", "severity": "major/minor", "correction": "..."}
    ],
    "positive_observations": ["..."],
    "overall_score": 0-100,
    "real_time_feedback": "immediate coaching tip",
    "voice_feedback": "short verbal guidance"
}

Assess like an experienced neurosurgical attending observing a trainee.""",

            AnalysisMode.INSTRUMENT: """Identify all surgical instruments visible in this image.

Provide detailed instrument analysis in JSON format:
{
    "instruments": [
        {
            "name": "specific instrument name",
            "type": "forceps/scissors/retractor/suction/bipolar/monopolar/drill/other",
            "location": {"x": 0-100, "y": 0-100},
            "bounding_box": [x1, y1, x2, y2] as percentages,
            "state": "idle/in_use/active",
            "held_by": "surgeon/assistant/none",
            "tip_visible": true/false,
            "confidence": 0.0-1.0
        }
    ],
    "instrument_count": number,
    "active_instruments": ["list of currently in-use instruments"],
    "mayo_stand_visible": true/false,
    "back_table_visible": true/false
}

Be specific about instrument types (e.g., "Adson forceps" not just "forceps").""",

            AnalysisMode.SEGMENTATION: """Analyze this neurosurgical/neuroimaging image and identify regions.

Provide segmentation guidance in JSON format:
{
    "image_type": "intraoperative/ultrasound/MRI/CT",
    "regions": [
        {
            "structure": "tumor/ventricle/parenchyma/vessel/edema/dura/bone/other",
            "approximate_boundary": [[x1,y1], [x2,y2], ...] as percentages,
            "intensity": "hyperintense/hypointense/isointense",
            "confidence": 0.0-1.0,
            "characteristics": "description"
        }
    ],
    "key_landmarks": [
        {"name": "...", "location": {"x": ..., "y": ...}}
    ],
    "suggested_thresholds": {
        "structure_name": {"low": 0-255, "high": 0-255}
    },
    "segmentation_guidance": "tips for accurate segmentation"
}

Apply knowledge of imaging physics and neuroanatomy.""",

            AnalysisMode.FULL: """Perform comprehensive analysis of this surgical/neurosurgical image.

Provide complete analysis in JSON format:
{
    "scene_type": "OR/microscope/endoscope/imaging",
    "surgical_phase": "...",
    
    "safety": {
        "sterile_field_status": "intact/compromised",
        "contamination_risks": [...],
        "safety_score": 0-100
    },
    
    "anatomy": {
        "structures": [...],
        "critical_structures_near_instruments": [...]
    },
    
    "instruments": {
        "identified": [...],
        "active": [...]
    },
    
    "technique": {
        "current_action": "...",
        "quality_score": 0-100,
        "feedback": "..."
    },
    
    "alerts": [
        {"severity": "critical/warning/info", "message": "...", "category": "..."}
    ],
    
    "guidance": "next step recommendation",
    "voice_alert": "critical alert for TTS or null"
}

Analyze as an expert neurosurgical AI assistant."""
        }
    
    def frame_to_base64(self, frame: np.ndarray) -> str:
        """Convert OpenCV frame to base64 for API."""
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return base64.b64encode(buffer).decode('utf-8')
    
    async def analyze_frame(
        self,
        frame: np.ndarray,
        mode: AnalysisMode = AnalysisMode.FULL,
        additional_context: Optional[str] = None
    ) -> Dict:
        """
        Analyze a frame using Claude's vision capabilities.
        
        Args:
            frame: OpenCV BGR frame
            mode: Analysis mode
            additional_context: Extra context to include in prompt
            
        Returns:
            Parsed JSON analysis results
        """
        base64_image = self.frame_to_base64(frame)
        
        prompt = self.prompts.get(mode, self.prompts[AnalysisMode.FULL])
        if additional_context:
            prompt += f"\n\nAdditional context: {additional_context}"
        
        prompt += "\n\nRespond ONLY with valid JSON, no other text."
        
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": base64_image
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )
            
            response_text = message.content[0].text
            
            # Parse JSON from response
            # Handle potential markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            return json.loads(response_text.strip())
            
        except json.JSONDecodeError as e:
            return {
                "error": "Failed to parse response",
                "raw_response": response_text if 'response_text' in locals() else None,
                "parse_error": str(e)
            }
        except Exception as e:
            return {
                "error": str(e),
                "type": type(e).__name__
            }
    
    def analyze_frame_sync(
        self,
        frame: np.ndarray,
        mode: AnalysisMode = AnalysisMode.FULL,
        additional_context: Optional[str] = None
    ) -> Dict:
        """Synchronous wrapper for analyze_frame."""
        return asyncio.run(self.analyze_frame(frame, mode, additional_context))


# =============================================================================
# REAL-TIME VISION SYSTEM
# =============================================================================

class RealTimeVisionSystem:
    """
    Complete real-time vision analysis system combining:
    - Camera capture
    - Local segmentation
    - Claude vision analysis
    - Streaming output
    """
    
    def __init__(
        self,
        camera_source: CameraSource = CameraSource.WEBCAM,
        source_path: str = "0",
        analysis_mode: AnalysisMode = AnalysisMode.FULL,
        use_claude: bool = True,
        claude_api_key: Optional[str] = None,
        analysis_fps: int = 2  # How often to run Claude analysis
    ):
        self.camera = CameraCapture(
            source=camera_source,
            source_path=source_path,
            target_fps=10
        )
        
        self.segmenter = NeuroimagingSegmenter(modality="OR_CAMERA")
        self.analysis_mode = analysis_mode
        self.analysis_fps = analysis_fps
        self.use_claude = use_claude
        
        if use_claude:
            try:
                self.claude = ClaudeVisionAnalyzer(api_key=claude_api_key)
            except Exception as e:
                print(f"Warning: Claude analyzer not available: {e}")
                self.claude = None
                self.use_claude = False
        else:
            self.claude = None
        
        self.is_running = False
        self.frame_count = 0
        self.last_claude_analysis = None
        self.last_analysis_time = 0
    
    async def analyze_stream(
        self,
        callback: Optional[Callable[[FrameAnalysis], None]] = None,
        show_preview: bool = True,
        max_frames: Optional[int] = None
    ) -> AsyncIterator[FrameAnalysis]:
        """
        Stream real-time analysis results.
        
        Args:
            callback: Optional callback for each analysis
            show_preview: Show OpenCV preview window
            max_frames: Stop after N frames (None = run forever)
            
        Yields:
            FrameAnalysis objects with detection results
        """
        if not self.camera.start():
            raise RuntimeError("Failed to start camera")
        
        self.is_running = True
        analysis_interval = 1.0 / self.analysis_fps
        
        print(f"\n{'='*60}")
        print("🎥 REAL-TIME VISION SYSTEM STARTED")
        print(f"   Mode: {self.analysis_mode.value}")
        print(f"   Claude Analysis: {'Enabled' if self.use_claude else 'Disabled'}")
        print(f"   Analysis FPS: {self.analysis_fps}")
        print(f"{'='*60}\n")
        
        try:
            while self.is_running:
                frame_data = self.camera.get_frame()
                if frame_data is None:
                    await asyncio.sleep(0.01)
                    continue
                
                frame = frame_data["frame"]
                frame_id = frame_data["frame_id"]
                timestamp = frame_data["timestamp"]
                
                self.frame_count += 1
                start_time = time.time()
                
                # Always run local segmentation (fast)
                masks = self.segmenter.segment_all(frame)
                overlay = self.segmenter.create_overlay(frame, masks)
                contours_data = self.segmenter.get_contours_and_centroids(masks)
                
                # Run Claude analysis at specified interval
                claude_result = None
                current_time = time.time()
                if self.use_claude and self.claude and (current_time - self.last_analysis_time) >= analysis_interval:
                    claude_result = await self.claude.analyze_frame(frame, self.analysis_mode)
                    self.last_claude_analysis = claude_result
                    self.last_analysis_time = current_time
                
                # Use last Claude analysis if we didn't run one this frame
                analysis_data = claude_result or self.last_claude_analysis or {}
                
                processing_time = (time.time() - start_time) * 1000
                
                # Build result
                result = FrameAnalysis(
                    frame_id=frame_id,
                    timestamp=timestamp,
                    processing_time_ms=processing_time,
                    mode=self.analysis_mode,
                    structures_detected=self._extract_structures(analysis_data, contours_data),
                    instruments_detected=analysis_data.get("instruments", analysis_data.get("instruments_visible", [])),
                    alerts=analysis_data.get("alerts", analysis_data.get("critical_alerts", [])),
                    segmentation_masks=masks,
                    segmentation_overlay=overlay,
                    safety_score=analysis_data.get("safety_score", analysis_data.get("safety", {}).get("safety_score", 100)),
                    technique_score=analysis_data.get("overall_score", analysis_data.get("technique", {}).get("quality_score")),
                    guidance=analysis_data.get("guidance", analysis_data.get("real_time_feedback")),
                    voice_alert=analysis_data.get("voice_alert", analysis_data.get("voice_feedback")),
                    raw_analysis=json.dumps(analysis_data) if analysis_data else None
                )
                
                # Show preview
                if show_preview:
                    self._show_preview(overlay, result)
                
                # Callback
                if callback:
                    callback(result)
                
                yield result
                
                # Check frame limit
                if max_frames and self.frame_count >= max_frames:
                    break
                
                # Check for quit key
                if show_preview and cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
        finally:
            self.is_running = False
            self.camera.stop()
            if show_preview:
                cv2.destroyAllWindows()
    
    def _extract_structures(self, analysis_data: Dict, contours_data: Dict) -> List[Dict]:
        """Combine Claude analysis with local segmentation results."""
        structures = []
        
        # From Claude analysis
        if "structures_identified" in analysis_data:
            structures.extend(analysis_data["structures_identified"])
        elif "anatomy" in analysis_data and "structures" in analysis_data["anatomy"]:
            structures.extend(analysis_data["anatomy"]["structures"])
        elif "regions" in analysis_data:
            structures.extend(analysis_data["regions"])
        
        # Add local segmentation results
        for structure_name, instances in contours_data.items():
            for instance in instances:
                structures.append({
                    "name": structure_name,
                    "source": "local_segmentation",
                    "centroid": instance["centroid"],
                    "area": instance["area"],
                    "bounding_box": instance["bounding_box"]
                })
        
        return structures
    
    def _show_preview(self, frame: np.ndarray, result: FrameAnalysis):
        """Show preview window with overlays."""
        display = frame.copy()
        
        # Add info overlay
        info_lines = [
            f"Frame: {result.frame_id}",
            f"Mode: {result.mode.value}",
            f"Processing: {result.processing_time_ms:.0f}ms",
            f"Safety: {result.safety_score:.0f}/100",
        ]
        
        if result.technique_score:
            info_lines.append(f"Technique: {result.technique_score:.0f}/100")
        
        if result.voice_alert:
            info_lines.append(f"ALERT: {result.voice_alert}")
        
        y_offset = 30
        for line in info_lines:
            cv2.putText(display, line, (10, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            y_offset += 25
        
        # Show alerts in red
        if result.alerts:
            for i, alert in enumerate(result.alerts[:3]):
                alert_text = alert if isinstance(alert, str) else alert.get("message", str(alert))
                cv2.putText(display, f"! {alert_text[:50]}", (10, display.shape[0] - 30 - i*25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        cv2.imshow("Claude Neurosurgical Vision System", display)
    
    def stop(self):
        """Stop the vision system."""
        self.is_running = False


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

async def analyze_image(
    image_path: str,
    mode: AnalysisMode = AnalysisMode.FULL,
    show_result: bool = True
) -> FrameAnalysis:
    """
    Analyze a single image file.
    
    Args:
        image_path: Path to image file
        mode: Analysis mode
        show_result: Display result window
        
    Returns:
        FrameAnalysis with results
    """
    system = RealTimeVisionSystem(
        camera_source=CameraSource.SINGLE_IMAGE,
        source_path=image_path,
        analysis_mode=mode,
        use_claude=True
    )
    
    async for result in system.analyze_stream(show_preview=show_result, max_frames=1):
        return result


async def run_webcam_analysis(
    mode: AnalysisMode = AnalysisMode.FULL,
    duration_seconds: Optional[int] = None
):
    """
    Run real-time webcam analysis.
    
    Args:
        mode: Analysis mode
        duration_seconds: Run for N seconds (None = until 'q' pressed)
    """
    system = RealTimeVisionSystem(
        camera_source=CameraSource.WEBCAM,
        source_path="0",
        analysis_mode=mode,
        use_claude=True,
        analysis_fps=2
    )
    
    start_time = time.time()
    
    async for result in system.analyze_stream(show_preview=True):
        print(f"\rFrame {result.frame_id} | Safety: {result.safety_score:.0f} | "
              f"Structures: {len(result.structures_detected)} | "
              f"Processing: {result.processing_time_ms:.0f}ms", end="")
        
        if result.voice_alert:
            print(f"\n🔊 ALERT: {result.voice_alert}")
        
        if duration_seconds and (time.time() - start_time) >= duration_seconds:
            break
    
    print("\n\nAnalysis complete.")


def run_local_segmentation_only(
    image_path: str,
    modality: str = "OR_CAMERA",
    output_path: Optional[str] = None
) -> Dict[str, np.ndarray]:
    """
    Run local segmentation without Claude API (faster, offline).
    
    Args:
        image_path: Path to image
        modality: USG, T1_GD, or OR_CAMERA
        output_path: Save overlay to this path
        
    Returns:
        Dictionary of segmentation masks
    """
    frame = cv2.imread(image_path)
    if frame is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    segmenter = NeuroimagingSegmenter(modality=modality)
    masks = segmenter.segment_all(frame)
    overlay = segmenter.create_overlay(frame, masks)
    contours = segmenter.get_contours_and_centroids(masks)
    
    print(f"Segmentation complete for: {image_path}")
    print(f"Structures found: {list(contours.keys())}")
    
    if output_path:
        cv2.imwrite(output_path, overlay)
        print(f"Overlay saved to: {output_path}")
    
    # Display
    cv2.imshow("Segmentation Result", overlay)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    
    return masks


# =============================================================================
# MAIN DEMO
# =============================================================================

async def main():
    """Demo the real-time vision system."""
    print("""
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                      ║
║           CLAUDE NEUROSURGICAL AI - REAL-TIME CAMERA VISION SYSTEM                                   ║
║                                                                                                      ║
║   This system provides ACTUAL camera-based vision analysis using:                                    ║
║                                                                                                      ║
║   📹 OpenCV Camera Capture                                                                           ║
║      - Webcam / USB cameras                                                                          ║
║      - IP cameras (RTSP)                                                                             ║
║      - Video files                                                                                   ║
║      - Single images                                                                                 ║
║                                                                                                      ║
║   👁️ Claude Vision API                                                                               ║
║      - Intelligent scene understanding                                                               ║
║      - Context-aware analysis                                                                        ║
║      - Natural language guidance                                                                     ║
║                                                                                                      ║
║   🧠 Local Neuroimaging Segmentation                                                                 ║
║      - Physics-based thresholding                                                                    ║
║      - Real-time structure detection                                                                 ║
║      - No API latency                                                                                ║
║                                                                                                      ║
║   📡 Streaming Output                                                                                ║
║      - Async iteration                                                                               ║
║      - Voice-ready alerts                                                                            ║
║      - Low-latency feedback                                                                          ║
║                                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝
    """)
    
    print("\nUsage Examples:")
    print("-" * 60)
    print("""
# 1. Analyze a single image
result = await analyze_image("surgical_frame.jpg", mode=AnalysisMode.OR_SAFETY)
print(result.safety_score)
print(result.voice_alert)

# 2. Run webcam analysis
await run_webcam_analysis(mode=AnalysisMode.FULL, duration_seconds=60)

# 3. Local segmentation only (no API)
masks = run_local_segmentation_only("brain_usg.png", modality="USG")

# 4. Custom streaming loop
system = RealTimeVisionSystem(
    camera_source=CameraSource.WEBCAM,
    analysis_mode=AnalysisMode.NAVIGATION,
    use_claude=True,
    analysis_fps=2
)

async for result in system.analyze_stream(show_preview=True):
    if result.voice_alert:
        speak(result.voice_alert)  # Your TTS function
    
    if result.safety_score < 80:
        trigger_warning()
    
    # Access segmentation masks
    tumor_mask = result.segmentation_masks.get("tumor")
    
    # Access Claude analysis
    for structure in result.structures_detected:
        print(f"Found: {structure['name']} at {structure.get('location')}")
""")
    
    print("\n" + "="*60)
    print("To run with actual camera, execute:")
    print("  python camera_vision_system.py --webcam")
    print("="*60)


if __name__ == "__main__":
    import sys
    
    if "--webcam" in sys.argv:
        # Run actual webcam analysis
        print("Starting webcam analysis...")
        print("Press 'q' to quit")
        asyncio.run(run_webcam_analysis(mode=AnalysisMode.FULL))
    elif "--image" in sys.argv and len(sys.argv) > sys.argv.index("--image") + 1:
        # Analyze single image
        image_path = sys.argv[sys.argv.index("--image") + 1]
        asyncio.run(analyze_image(image_path, mode=AnalysisMode.FULL))
    elif "--segment" in sys.argv and len(sys.argv) > sys.argv.index("--segment") + 1:
        # Local segmentation only
        image_path = sys.argv[sys.argv.index("--segment") + 1]
        run_local_segmentation_only(image_path)
    else:
        # Show demo/help
        asyncio.run(main())

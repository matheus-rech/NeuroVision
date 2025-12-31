#!/usr/bin/env python3
"""
ARIA Camera Service
===================

Background camera capture service using OpenCV with frame queue management.
Optimized for real-time surgical dashboard streaming.

Features:
- Background thread capture with configurable FPS
- Frame queue with overflow handling (30 frames)
- Base64 JPEG encoding for WebSocket transmission
- Multiple camera source support (webcam, IP camera, video file)
"""

import cv2
import base64
import time
import threading
from queue import Queue, Empty
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio


class CameraSourceType(Enum):
    """Supported camera source types."""
    WEBCAM = "webcam"
    IP_CAMERA = "ip_camera"
    VIDEO_FILE = "video_file"
    SYNTHETIC = "synthetic"  # For testing without camera


@dataclass
class CapturedFrame:
    """Container for a captured camera frame."""
    frame_id: int
    timestamp: datetime
    raw_frame: Any  # numpy array
    encoded_base64: Optional[str] = None
    width: int = 0
    height: int = 0

    def encode_to_base64(self, quality: int = 85) -> str:
        """Encode raw frame to base64 JPEG."""
        if self.encoded_base64 is None:
            _, buffer = cv2.imencode(
                '.jpg',
                self.raw_frame,
                [cv2.IMWRITE_JPEG_QUALITY, quality]
            )
            self.encoded_base64 = base64.b64encode(buffer).decode('utf-8')
        return self.encoded_base64

    def to_dict(self, include_frame: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "frame_id": self.frame_id,
            "timestamp": self.timestamp.isoformat(),
            "width": self.width,
            "height": self.height,
        }
        if include_frame:
            result["frame_base64"] = self.encode_to_base64()
        return result


class CameraService:
    """
    Background camera capture service.

    Runs capture in a separate thread and maintains a frame queue
    for async consumption by WebSocket handlers.
    """

    DEFAULT_RESOLUTION = (1280, 720)
    DEFAULT_FPS = 30
    QUEUE_MAX_SIZE = 30

    def __init__(
        self,
        source_type: CameraSourceType = CameraSourceType.WEBCAM,
        source_path: str = "0",
        target_fps: int = DEFAULT_FPS,
        resolution: Tuple[int, int] = DEFAULT_RESOLUTION,
        jpeg_quality: int = 85
    ):
        self.source_type = source_type
        self.source_path = source_path
        self.target_fps = target_fps
        self.resolution = resolution
        self.jpeg_quality = jpeg_quality

        # State
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.is_paused = False
        self.frame_queue: Queue[CapturedFrame] = Queue(maxsize=self.QUEUE_MAX_SIZE)
        self.capture_thread: Optional[threading.Thread] = None

        # Statistics
        self.frame_count = 0
        self.dropped_frames = 0
        self.start_time: Optional[datetime] = None
        self.actual_fps = 0.0

        # Lock for thread-safe operations
        self._lock = threading.Lock()

    def start(self) -> bool:
        """
        Start camera capture in background thread.

        Returns:
            True if camera started successfully, False otherwise.
        """
        if self.is_running:
            return True

        # Initialize capture device
        if self.source_type == CameraSourceType.SYNTHETIC:
            self.is_running = True
            self.start_time = datetime.now()
            self.capture_thread = threading.Thread(
                target=self._synthetic_capture_loop,
                daemon=True
            )
            self.capture_thread.start()
            return True

        if self.source_type == CameraSourceType.WEBCAM:
            self.cap = cv2.VideoCapture(int(self.source_path))
        elif self.source_type in (CameraSourceType.IP_CAMERA, CameraSourceType.VIDEO_FILE):
            self.cap = cv2.VideoCapture(self.source_path)

        if self.cap is None or not self.cap.isOpened():
            print(f"[CameraService] Error: Could not open source: {self.source_path}")
            return False

        # Configure camera
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
        self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)

        # Get actual resolution
        actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.resolution = (actual_width, actual_height)

        self.is_running = True
        self.start_time = datetime.now()
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()

        print(f"[CameraService] Started: {self.source_type.value} @ {self.resolution} target {self.target_fps} FPS")
        return True

    def _capture_loop(self):
        """Background thread main capture loop."""
        frame_interval = 1.0 / self.target_fps
        fps_sample_count = 0
        fps_sample_start = time.time()

        while self.is_running:
            loop_start = time.time()

            if self.is_paused:
                time.sleep(0.1)
                continue

            ret, frame = self.cap.read()

            if not ret:
                if self.source_type == CameraSourceType.VIDEO_FILE:
                    # Loop video for testing
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    print("[CameraService] Warning: Failed to capture frame")
                    time.sleep(0.1)
                    continue

            with self._lock:
                self.frame_count += 1
                frame_id = self.frame_count

            # Calculate actual FPS
            fps_sample_count += 1
            if fps_sample_count >= 30:
                elapsed = time.time() - fps_sample_start
                self.actual_fps = fps_sample_count / elapsed if elapsed > 0 else 0
                fps_sample_count = 0
                fps_sample_start = time.time()

            # Create frame object
            captured = CapturedFrame(
                frame_id=frame_id,
                timestamp=datetime.now(),
                raw_frame=frame,
                width=frame.shape[1],
                height=frame.shape[0]
            )

            # Queue management: drop oldest if full
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                    self.dropped_frames += 1
                except Empty:
                    pass

            self.frame_queue.put(captured)

            # Maintain target FPS
            elapsed = time.time() - loop_start
            if elapsed < frame_interval:
                time.sleep(frame_interval - elapsed)

    def _synthetic_capture_loop(self):
        """Generate synthetic frames for testing without camera."""
        import numpy as np
        frame_interval = 1.0 / self.target_fps

        while self.is_running:
            loop_start = time.time()

            if self.is_paused:
                time.sleep(0.1)
                continue

            with self._lock:
                self.frame_count += 1
                frame_id = self.frame_count

            # Generate synthetic surgical-like frame
            frame = np.zeros((self.resolution[1], self.resolution[0], 3), dtype=np.uint8)

            # Dark reddish background (surgical field)
            frame[:, :] = (30, 20, 60)

            # Add some structure
            center_x, center_y = self.resolution[0] // 2, self.resolution[1] // 2

            # Pulsing circle (simulating heartbeat in tissue)
            pulse = int(20 * np.sin(time.time() * 5) + 100)
            cv2.circle(frame, (center_x, center_y), pulse, (50, 50, 120), -1)

            # Instrument-like shapes
            instrument_y = center_y + int(50 * np.sin(time.time() * 2))
            cv2.line(frame, (center_x - 200, instrument_y), (center_x - 50, center_y), (180, 180, 200), 4)

            # Add frame info
            cv2.putText(
                frame,
                f"SYNTHETIC FEED - Frame {frame_id}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2
            )
            cv2.putText(
                frame,
                datetime.now().strftime("%H:%M:%S.%f")[:-3],
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1
            )

            captured = CapturedFrame(
                frame_id=frame_id,
                timestamp=datetime.now(),
                raw_frame=frame,
                width=frame.shape[1],
                height=frame.shape[0]
            )

            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                    self.dropped_frames += 1
                except Empty:
                    pass

            self.frame_queue.put(captured)

            elapsed = time.time() - loop_start
            if elapsed < frame_interval:
                time.sleep(frame_interval - elapsed)

    def get_frame(self, timeout: float = 0.1) -> Optional[CapturedFrame]:
        """
        Get the next frame from the queue.

        Args:
            timeout: Maximum time to wait for a frame in seconds.

        Returns:
            CapturedFrame or None if no frame available.
        """
        try:
            return self.frame_queue.get(timeout=timeout)
        except Empty:
            return None

    def get_latest_frame(self) -> Optional[CapturedFrame]:
        """
        Get the most recent frame, discarding older ones.

        Returns:
            Latest CapturedFrame or None if queue is empty.
        """
        latest = None
        try:
            while True:
                latest = self.frame_queue.get_nowait()
        except Empty:
            pass
        return latest

    async def get_frame_async(self, timeout: float = 0.1) -> Optional[CapturedFrame]:
        """Async wrapper for get_frame."""
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: self.get_frame(timeout)
        )

    def pause(self):
        """Pause frame capture."""
        self.is_paused = True

    def resume(self):
        """Resume frame capture."""
        self.is_paused = False

    def stop(self):
        """Stop camera capture and release resources."""
        self.is_running = False

        if self.capture_thread:
            self.capture_thread.join(timeout=2.0)
            self.capture_thread = None

        if self.cap:
            self.cap.release()
            self.cap = None

        # Clear queue
        while not self.frame_queue.empty():
            try:
                self.frame_queue.get_nowait()
            except Empty:
                break

        print(f"[CameraService] Stopped. Captured {self.frame_count} frames, dropped {self.dropped_frames}")

    def get_status(self) -> Dict[str, Any]:
        """Get current camera service status."""
        return {
            "running": self.is_running,
            "paused": self.is_paused,
            "source_type": self.source_type.value,
            "source_path": self.source_path,
            "resolution": self.resolution,
            "target_fps": self.target_fps,
            "actual_fps": round(self.actual_fps, 1),
            "frame_count": self.frame_count,
            "dropped_frames": self.dropped_frames,
            "queue_size": self.frame_queue.qsize(),
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        }


# Singleton instance for the application
_camera_instance: Optional[CameraService] = None


def get_camera_service() -> CameraService:
    """Get or create the global camera service instance."""
    global _camera_instance
    if _camera_instance is None:
        _camera_instance = CameraService(source_type=CameraSourceType.SYNTHETIC)
    return _camera_instance


def init_camera_service(
    source_type: CameraSourceType = CameraSourceType.SYNTHETIC,
    source_path: str = "0",
    **kwargs
) -> CameraService:
    """Initialize the global camera service with specific settings."""
    global _camera_instance
    if _camera_instance is not None:
        _camera_instance.stop()
    _camera_instance = CameraService(
        source_type=source_type,
        source_path=source_path,
        **kwargs
    )
    return _camera_instance

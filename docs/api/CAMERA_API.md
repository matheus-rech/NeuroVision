# Camera API Reference

## CameraCapture

Camera capture handler with threading support.

### Constructor

```python
CameraCapture(
    source: CameraSource = CameraSource.WEBCAM,
    source_path: str = "0",
    target_fps: int = 10,
    resolution: Tuple[int, int] = (1280, 720)
)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | CameraSource | WEBCAM | Camera source type |
| `source_path` | str | "0" | Path or index for camera |
| `target_fps` | int | 10 | Target capture FPS |
| `resolution` | Tuple[int, int] | (1280, 720) | Frame resolution |

### Methods

#### `start() -> bool`

Start camera capture in background thread.

```python
camera = CameraCapture(source=CameraSource.WEBCAM)
if camera.start():
    print("Camera started successfully")
else:
    print("Failed to start camera")
```

#### `get_frame() -> Optional[Dict]`

Get latest frame from buffer.

```python
frame_data = camera.get_frame()
if frame_data:
    frame = frame_data["frame"]        # numpy array (BGR)
    frame_id = frame_data["frame_id"]  # int
    timestamp = frame_data["timestamp"] # datetime
```

#### `stop()`

Stop camera capture and release resources.

```python
camera.stop()
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `is_running` | bool | Capture status |
| `frame_count` | int | Total frames captured |
| `frame_queue` | Queue | Frame buffer |

---

## CameraSource

Enum for camera source types.

```python
from neurovision.vision import CameraSource

class CameraSource(Enum):
    WEBCAM = "webcam"           # USB/built-in camera
    IP_CAMERA = "ip_camera"     # RTSP stream
    VIDEO_FILE = "video_file"   # Video file playback
    SINGLE_IMAGE = "single_image" # Static image
```

### Examples

```python
# Webcam (index 0)
CameraCapture(source=CameraSource.WEBCAM, source_path="0")

# IP Camera
CameraCapture(
    source=CameraSource.IP_CAMERA,
    source_path="rtsp://admin:password@192.168.1.100:554/stream"
)

# Video file
CameraCapture(
    source=CameraSource.VIDEO_FILE,
    source_path="/path/to/surgery_recording.mp4"
)

# Single image
CameraCapture(
    source=CameraSource.SINGLE_IMAGE,
    source_path="/path/to/frame.jpg"
)
```

---

## AnalysisMode

Enum for analysis types.

```python
from neurovision.vision import AnalysisMode

class AnalysisMode(Enum):
    OR_SAFETY = "or_safety"       # OR safety monitoring
    NAVIGATION = "navigation"      # Surgical navigation
    TRAINING = "training"          # Training assessment
    SEGMENTATION = "segmentation"  # Structure segmentation
    INSTRUMENT = "instrument"      # Instrument tracking
    FULL = "full"                  # All combined
```

---

## RealTimeVisionSystem

Main orchestration class for real-time vision analysis.

### Constructor

```python
RealTimeVisionSystem(
    camera_source: CameraSource = CameraSource.WEBCAM,
    source_path: str = "0",
    analysis_mode: AnalysisMode = AnalysisMode.FULL,
    use_claude: bool = True,
    claude_api_key: Optional[str] = None,
    analysis_fps: int = 2
)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `camera_source` | CameraSource | WEBCAM | Camera type |
| `source_path` | str | "0" | Camera path/index |
| `analysis_mode` | AnalysisMode | FULL | Analysis type |
| `use_claude` | bool | True | Enable Claude API |
| `claude_api_key` | Optional[str] | None | API key (uses env if None) |
| `analysis_fps` | int | 2 | Claude analysis frequency |

### Methods

#### `analyze_stream() -> AsyncIterator[FrameAnalysis]`

Stream real-time analysis results.

```python
async def main():
    system = RealTimeVisionSystem(
        camera_source=CameraSource.WEBCAM,
        analysis_mode=AnalysisMode.FULL
    )
    
    async for result in system.analyze_stream(show_preview=True):
        print(f"Frame {result.frame_id}: Safety={result.safety_score}")
        
        if result.voice_alert:
            speak(result.voice_alert)

asyncio.run(main())
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `callback` | Callable | None | Per-frame callback |
| `show_preview` | bool | True | Display OpenCV window |
| `max_frames` | Optional[int] | None | Stop after N frames |

**Yields:** `FrameAnalysis`

#### `stop()`

Stop the vision system.

```python
system.stop()
```

---

## FrameAnalysis

Dataclass containing analysis results.

```python
@dataclass
class FrameAnalysis:
    # Metadata
    frame_id: int
    timestamp: datetime
    processing_time_ms: float
    mode: AnalysisMode
    
    # Detections
    structures_detected: List[Dict]
    instruments_detected: List[Dict]
    alerts: List[Dict]
    
    # Segmentation
    segmentation_masks: Optional[Dict[str, np.ndarray]]
    segmentation_overlay: Optional[np.ndarray]
    
    # Scores
    safety_score: float
    technique_score: Optional[float]
    
    # Guidance
    guidance: Optional[str]
    voice_alert: Optional[str]
    
    # Raw
    raw_analysis: Optional[str]
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `frame_id` | int | Sequential frame number |
| `timestamp` | datetime | Capture timestamp |
| `processing_time_ms` | float | Total processing time |
| `mode` | AnalysisMode | Analysis mode used |
| `structures_detected` | List[Dict] | Detected anatomical structures |
| `instruments_detected` | List[Dict] | Detected instruments |
| `alerts` | List[Dict] | Generated alerts |
| `segmentation_masks` | Dict[str, ndarray] | Binary masks per structure |
| `segmentation_overlay` | ndarray | Colored visualization |
| `safety_score` | float | 0-100 safety score |
| `technique_score` | Optional[float] | 0-100 technique score |
| `guidance` | Optional[str] | Next step guidance |
| `voice_alert` | Optional[str] | TTS-ready alert |
| `raw_analysis` | Optional[str] | Raw Claude response |

### Methods

#### `to_dict() -> Dict`

Convert to dictionary for JSON serialization.

```python
result_dict = analysis.to_dict()
json.dumps(result_dict)
```

---

## Convenience Functions

### `analyze_image()`

Analyze a single image file.

```python
async def analyze_image(
    image_path: str,
    mode: AnalysisMode = AnalysisMode.FULL,
    show_result: bool = True
) -> FrameAnalysis
```

**Example:**
```python
result = await analyze_image(
    "surgical_frame.jpg",
    mode=AnalysisMode.OR_SAFETY
)
print(f"Safety: {result.safety_score}")
```

### `run_webcam_analysis()`

Run interactive webcam analysis.

```python
async def run_webcam_analysis(
    mode: AnalysisMode = AnalysisMode.FULL,
    duration_seconds: Optional[int] = None
)
```

**Example:**
```python
# Run for 60 seconds
await run_webcam_analysis(
    mode=AnalysisMode.NAVIGATION,
    duration_seconds=60
)
```

### `run_local_segmentation_only()`

Run segmentation without Claude API.

```python
def run_local_segmentation_only(
    image_path: str,
    modality: str = "OR_CAMERA",
    output_path: Optional[str] = None
) -> Dict[str, np.ndarray]
```

**Example:**
```python
masks = run_local_segmentation_only(
    "brain_usg.png",
    modality="USG",
    output_path="segmented.png"
)

print(f"Found: {list(masks.keys())}")
```

---

## Error Handling

### Common Exceptions

```python
try:
    async for result in system.analyze_stream():
        process(result)
        
except CameraError as e:
    print(f"Camera failed: {e}")
    
except ClaudeAPIError as e:
    print(f"Claude API error: {e}")
    # System continues with local-only analysis
    
except KeyboardInterrupt:
    system.stop()
```

### Graceful Degradation

When Claude API fails, the system:
1. Logs the error
2. Returns last cached Claude result
3. Continues local segmentation
4. Sets `raw_analysis = None`

```python
# Check if Claude analysis is available
if result.raw_analysis is None:
    print("Running in local-only mode")
```

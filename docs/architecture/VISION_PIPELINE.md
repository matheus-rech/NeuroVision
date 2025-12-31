# Vision Pipeline Documentation

## Overview

The NeuroVision vision pipeline processes surgical imagery through multiple stages to provide real-time structure detection, safety monitoring, and intelligent guidance.

---

## Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VISION PIPELINE                                  │
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐ │
│  │ CAPTURE │ →  │ PREPROC │ →  │ SEGMENT │ →  │ ANALYZE │ →  │ OUTPUT │ │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └────────┘ │
│       │              │              │              │              │      │
│       ▼              ▼              ▼              ▼              ▼      │
│   Raw Frame     Normalized     Binary Masks   Detections    FrameAnalysis│
│   (BGR)         Grayscale      per structure  + Scores      + Alerts     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Capture

### Camera Sources

| Source | Protocol | Example |
|--------|----------|---------|
| Webcam | USB/V4L2 | `CameraSource.WEBCAM, "0"` |
| IP Camera | RTSP | `CameraSource.IP_CAMERA, "rtsp://192.168.1.100/stream"` |
| Video File | File I/O | `CameraSource.VIDEO_FILE, "/path/to/video.mp4"` |
| Single Image | File I/O | `CameraSource.SINGLE_IMAGE, "/path/to/image.jpg"` |

### Frame Buffer

```python
class CameraCapture:
    def __init__(self):
        self.frame_queue = Queue(maxsize=30)
        
    def _capture_loop(self):
        while self.is_running:
            ret, frame = self.cap.read()
            
            # Drop oldest if full
            if self.frame_queue.full():
                self.frame_queue.get_nowait()
            
            self.frame_queue.put({
                "frame": frame,
                "frame_id": self.frame_count,
                "timestamp": datetime.now()
            })
```

### Supported Formats

| Format | Color Space | Depth |
|--------|-------------|-------|
| BGR | OpenCV default | 8-bit |
| Grayscale | Mono | 8-bit |
| RGB | Display | 8-bit |
| DICOM | Medical | 16-bit (converted) |

---

## Stage 2: Preprocessing

### Grayscale Conversion

```python
def preprocess(self, frame: np.ndarray):
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame
    
    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    return gray, blurred
```

### ROI Mask Creation

```python
def create_roi_mask(self, blurred: np.ndarray, threshold: int = 15):
    # Binary threshold to separate foreground
    _, roi = cv2.threshold(blurred, threshold, 255, cv2.THRESH_BINARY)
    
    # Morphological closing to fill holes
    kernel = np.ones((10, 10), np.uint8)
    roi = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, kernel, iterations=3)
    
    return roi
```

### Noise Reduction Strategies

| Modality | Noise Type | Strategy |
|----------|------------|----------|
| Ultrasound | Speckle | Gaussian blur (5x5) |
| OR Camera | Motion blur | Temporal averaging |
| MRI | Rician | Median filter |

---

## Stage 3: Segmentation

### Physics-Based Thresholding

Medical images have predictable intensity patterns based on tissue physics:

#### Ultrasound (USG)

| Structure | Echogenicity | Physics | Threshold |
|-----------|-------------|---------|-----------|
| Tumor | Hyperechoic | High reflection | 160-255 |
| CSF | Anechoic | No reflection | 0-40 |
| Parenchyma | Isoechoic | Moderate reflection | 50-150 |
| Hemorrhage | Variable | Age-dependent | Context |

#### MRI T1 with Gadolinium

| Structure | Signal | Physics | Threshold |
|-----------|--------|---------|-----------|
| Enhancement | Hyperintense | Gd contrast uptake | 170-255 |
| Necrosis | Hypointense | No blood flow | 0-45 |
| Edema | Hypointense | Increased water | 45-85 |
| Normal brain | Isointense | Baseline | 85-165 |

### Segmentation Algorithm

```python
def segment_structure(self, blurred, roi_mask, structure, min_area=200):
    low, high = self.thresholds[structure]
    
    # Apply threshold
    if low == 0:
        _, mask = cv2.threshold(blurred, high, 255, cv2.THRESH_BINARY_INV)
    else:
        mask = cv2.inRange(blurred, low, high)
    
    # Apply ROI constraint
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
```

### Morphological Operations

| Operation | Purpose | Kernel | Iterations |
|-----------|---------|--------|------------|
| Close | Fill holes | 5x5 | 2 |
| Open | Remove noise | 5x5 | 1 |
| Dilate | Expand boundaries | 3x3 | 1 |
| Erode | Shrink boundaries | 3x3 | 1 |

---

## Stage 4: Analysis

### Claude Vision Integration

```python
async def analyze_frame(self, frame: np.ndarray, mode: AnalysisMode):
    # Convert to base64
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    base64_image = base64.b64encode(buffer).decode('utf-8')
    
    # Build prompt based on mode
    prompt = self.prompts[mode]
    
    # Call Claude API
    message = self.client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{
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
                {"type": "text", "text": prompt}
            ]
        }]
    )
    
    return json.loads(message.content[0].text)
```

### Analysis Modes

#### OR_SAFETY Mode

**Focus**: Operating room safety monitoring

**Output Schema**:
```json
{
    "sterile_field": {
        "status": "intact|compromised",
        "breaches": [{"description": "", "location": "", "severity": ""}]
    },
    "contamination_risks": [],
    "instruments": [{"name": "", "state": "", "location": ""}],
    "personnel": [{"role": "", "scrubbed": true, "position_appropriate": true}],
    "safety_score": 85,
    "critical_alerts": [],
    "voice_alert": "Check sterile field"
}
```

#### NAVIGATION Mode

**Focus**: Intraoperative guidance

**Output Schema**:
```json
{
    "structures_identified": [
        {
            "name": "motor_cortex",
            "type": "critical",
            "location": {"x": 45, "y": 30},
            "bounding_box": [40, 25, 55, 40],
            "confidence": 0.92,
            "safety_margin_mm": 10
        }
    ],
    "instruments_visible": [],
    "proximity_warnings": [],
    "current_phase": "resection",
    "guidance": "Maintain 5mm margin from eloquent cortex",
    "voice_alert": null
}
```

#### TRAINING Mode

**Focus**: Technique assessment

**Output Schema**:
```json
{
    "current_action": "Bipolar coagulation of vessel",
    "technique_assessment": {
        "tissue_handling": {"score": 85, "feedback": "Good traction"},
        "instrument_use": {"score": 90, "feedback": "Appropriate bipolar settings"},
        "efficiency": {"score": 75, "feedback": "Consider workflow optimization"},
        "safety": {"score": 95, "feedback": "Excellent vessel identification"}
    },
    "errors_detected": [],
    "positive_observations": ["Clean surgical field", "Systematic approach"],
    "overall_score": 86,
    "real_time_feedback": "Continue current technique",
    "voice_feedback": null
}
```

### Feature Extraction

```python
def get_contours_and_stats(self, masks: Dict[str, np.ndarray]):
    results = {}
    
    for structure, mask in masks.items():
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        structure_data = []
        for cnt in contours:
            M = cv2.moments(cnt)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])  # Centroid X
                cy = int(M["m01"] / M["m00"])  # Centroid Y
                area = cv2.contourArea(cnt)
                x, y, w, h = cv2.boundingRect(cnt)
                perimeter = cv2.arcLength(cnt, True)
                
                structure_data.append({
                    "centroid": (cx, cy),
                    "area_px": int(area),
                    "bounding_box": (x, y, w, h),
                    "perimeter": round(perimeter, 1)
                })
        
        if structure_data:
            results[structure] = structure_data
    
    return results
```

---

## Stage 5: Output

### FrameAnalysis Structure

```python
@dataclass
class FrameAnalysis:
    frame_id: int
    timestamp: datetime
    processing_time_ms: float
    mode: AnalysisMode
    
    # Detection results
    structures_detected: List[Dict]
    instruments_detected: List[Dict]
    alerts: List[Dict]
    
    # Segmentation
    segmentation_masks: Dict[str, np.ndarray]
    segmentation_overlay: np.ndarray
    
    # Scores
    safety_score: float
    technique_score: Optional[float]
    
    # Guidance
    guidance: Optional[str]
    voice_alert: Optional[str]
    
    # Raw
    raw_analysis: Optional[str]
```

### Visualization

```python
def create_overlay(self, frame, masks, alpha=0.45):
    frame_rgb = frame.copy()
    overlay = frame_rgb.copy()
    
    # Color coding
    COLORS = {
        "tumor": (80, 80, 255),      # Red
        "ventricles": (255, 150, 0),  # Blue
        "parenchyma": (100, 200, 100) # Green
    }
    
    for structure, mask in masks.items():
        if structure in COLORS and np.any(mask > 0):
            overlay[mask > 0] = COLORS[structure]
    
    result = cv2.addWeighted(overlay, alpha, frame_rgb, 1 - alpha, 0)
    return result
```

### Alert Generation

```python
def generate_alerts(self, analysis: FrameAnalysis) -> List[Dict]:
    alerts = []
    
    # Safety score threshold
    if analysis.safety_score < 80:
        alerts.append({
            "severity": "WARNING",
            "message": f"Safety score below threshold: {analysis.safety_score}",
            "category": "safety"
        })
    
    # Proximity check
    for structure in analysis.structures_detected:
        if structure.get("safety_critical"):
            for instrument in analysis.instruments_detected:
                distance = calculate_distance(
                    structure["centroid"],
                    instrument.get("tip_location")
                )
                if distance < structure.get("safety_margin_mm", 5):
                    alerts.append({
                        "severity": "CRITICAL",
                        "message": f"Instrument near {structure['name']}",
                        "category": "proximity"
                    })
    
    return alerts
```

---

## Performance Metrics

### Latency Breakdown

| Stage | Local | With Claude |
|-------|-------|-------------|
| Capture | 5ms | 5ms |
| Preprocess | 2ms | 2ms |
| Segmentation | 27ms | 27ms |
| Claude API | - | 500ms |
| Feature extraction | 3ms | 3ms |
| Overlay | 3ms | 3ms |
| **Total** | **40ms** | **540ms** |

### Throughput

| Configuration | FPS | Latency |
|---------------|-----|---------|
| Local only | 36+ | 27ms |
| Local + Claude (2Hz) | 36+ | 27ms (local) |
| Full sync | 2 | 500ms |

### Memory Usage

| Component | Memory |
|-----------|--------|
| Frame buffer (30 frames) | ~80MB |
| Masks (4 structures) | ~15MB |
| Claude cache | ~1MB |
| Overlay buffer | ~2.7MB |
| **Total** | ~100MB |

---

## Calibration

### Threshold Tuning

```python
def tune_thresholds(self, sample_images, ground_truth_masks):
    """
    Optimize thresholds using labeled examples.
    
    Uses percentile-based estimation from ground truth.
    """
    for structure in self.thresholds.keys():
        intensities = []
        
        for img, mask in zip(sample_images, ground_truth_masks):
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            structure_mask = mask == STRUCTURE_IDS[structure]
            intensities.extend(gray[structure_mask].tolist())
        
        if intensities:
            self.thresholds[structure] = (
                int(np.percentile(intensities, 5)),
                int(np.percentile(intensities, 95))
            )
```

### Camera Calibration

```python
def calibrate_camera(self, checkerboard_images, pattern_size=(9, 6)):
    """
    Standard camera calibration for distortion correction.
    """
    objpoints = []
    imgpoints = []
    
    objp = np.zeros((pattern_size[0] * pattern_size[1], 3), np.float32)
    objp[:, :2] = np.mgrid[0:pattern_size[0], 0:pattern_size[1]].T.reshape(-1, 2)
    
    for img in checkerboard_images:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        ret, corners = cv2.findChessboardCorners(gray, pattern_size)
        
        if ret:
            objpoints.append(objp)
            imgpoints.append(corners)
    
    ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(
        objpoints, imgpoints, gray.shape[::-1], None, None
    )
    
    return mtx, dist
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No detection | Threshold mismatch | Tune for modality |
| Over-segmentation | Low min_area | Increase to 500+ |
| Missed structures | High threshold | Lower range |
| Slow FPS | Large resolution | Reduce to 720p |
| API timeout | Network | Increase timeout |

### Debug Mode

```python
system = RealTimeVisionSystem(
    camera_source=CameraSource.WEBCAM,
    analysis_mode=AnalysisMode.FULL,
    debug=True  # Enable verbose logging
)

# Logs will show:
# - Frame timing
# - Segmentation results
# - API responses
# - Alert generation
```

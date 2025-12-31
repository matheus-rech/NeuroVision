# System Architecture

## Overview

NeuroVision is a modular, real-time AI system designed for neurosurgical applications. The architecture prioritizes:

1. **Low latency** - Real-time feedback essential for surgery
2. **Safety-first** - Multiple redundant safety checks
3. **Modularity** - Components can be used independently
4. **Extensibility** - Easy to add new procedures, robots, modalities

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NEUROVISION PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         INPUT LAYER                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │  Webcam  │ │IP Camera │ │  Video   │ │  Image   │ │  DICOM   │       │   │
│  │  │  (USB)   │ │ (RTSP)   │ │  File    │ │  File    │ │  Series  │       │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │   │
│  │       └───────────┴──────┬──────┴─────────────┴───────────┘             │   │
│  └──────────────────────────┼──────────────────────────────────────────────┘   │
│                             │                                                   │
│                             ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       CAPTURE LAYER                                      │   │
│  │                                                                          │   │
│  │  CameraCapture                                                           │   │
│  │  ├── Background capture thread                                           │   │
│  │  ├── Frame queue (30 frames buffer)                                      │   │
│  │  ├── FPS control (10 FPS default)                                        │   │
│  │  └── Resolution management (1280x720)                                    │   │
│  │                                                                          │   │
│  └──────────────────────────┬──────────────────────────────────────────────┘   │
│                             │                                                   │
│            ┌────────────────┴────────────────┐                                  │
│            │                                 │                                  │
│            ▼                                 ▼                                  │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                   │
│  │   LOCAL PROCESSING      │     │   CLOUD PROCESSING      │                   │
│  │                         │     │                         │                   │
│  │  NeuroimagingSegmenter  │     │  ClaudeVisionAnalyzer   │                   │
│  │  ├── Preprocess         │     │  ├── Frame to Base64    │                   │
│  │  ├── ROI mask           │     │  ├── Claude API call    │                   │
│  │  ├── Threshold segment  │     │  ├── JSON parsing       │                   │
│  │  ├── Morphology clean   │     │  └── Result extraction  │                   │
│  │  └── Contour extract    │     │                         │                   │
│  │                         │     │  Latency: ~500ms        │                   │
│  │  Latency: ~27ms         │     │  Frequency: 2 Hz        │                   │
│  │  Frequency: 36 Hz       │     │                         │                   │
│  └───────────┬─────────────┘     └───────────┬─────────────┘                   │
│              │                               │                                  │
│              └───────────────┬───────────────┘                                  │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       FUSION LAYER                                       │   │
│  │                                                                          │   │
│  │  FrameAnalysis                                                           │   │
│  │  ├── Combine local masks + Claude detections                             │   │
│  │  ├── Compute safety scores                                               │   │
│  │  ├── Generate alerts by severity                                         │   │
│  │  ├── Create voice-ready messages                                         │   │
│  │  └── Produce visualization overlays                                      │   │
│  │                                                                          │   │
│  └──────────────────────────┬──────────────────────────────────────────────┘   │
│                             │                                                   │
│         ┌───────────────────┼───────────────────┐                               │
│         │                   │                   │                               │
│         ▼                   ▼                   ▼                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                       │
│  │  OR SAFETY  │     │ NAVIGATION  │     │  TRAINING   │                       │
│  │  MONITOR    │     │  ASSISTANT  │     │  SYSTEM     │                       │
│  │             │     │             │     │             │                       │
│  │ • Sterile   │     │ • Trajectory│     │ • Procedure │                       │
│  │   field     │     │   tracking  │     │   steps     │                       │
│  │ • Contam-   │     │ • Proximity │     │ • Technique │                       │
│  │   ination   │     │   warnings  │     │   scoring   │                       │
│  │ • Personnel │     │ • Phase     │     │ • Real-time │                       │
│  │   tracking  │     │   detection │     │   feedback  │                       │
│  │ • Instrument│     │ • Guidance  │     │ • Certifi-  │                       │
│  │   status    │     │   messages  │     │   cation    │                       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                       │
│         │                   │                   │                               │
│         └───────────────────┼───────────────────┘                               │
│                             │                                                   │
│                             ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       OUTPUT LAYER                                       │   │
│  │                                                                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │  Visual  │ │  Voice   │ │   Log    │ │  Robot   │ │   API    │       │   │
│  │  │  Display │ │  Alerts  │ │  Events  │ │ Commands │ │ Webhook  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. CameraCapture

**Purpose**: Reliable frame acquisition from various sources

**Implementation**:
```python
class CameraCapture:
    def __init__(
        self,
        source: CameraSource,
        source_path: str,
        target_fps: int = 10,
        resolution: Tuple[int, int] = (1280, 720)
    ):
        self.frame_queue = Queue(maxsize=30)
        self.capture_thread = Thread(target=self._capture_loop)
```

**Features**:
- Background thread prevents frame drops
- Queue buffer handles processing delays
- Automatic reconnection for IP cameras
- Frame timestamping for synchronization

**Performance**:
| Metric | Value |
|--------|-------|
| Queue size | 30 frames |
| Capture FPS | 10 (configurable) |
| Thread priority | Daemon (auto-cleanup) |
| Memory per frame | ~2.7MB (1280x720 BGR) |

---

### 2. NeuroimagingSegmenter

**Purpose**: Fast, physics-based structure segmentation

**Algorithm**:
```
1. Preprocess
   └── Gaussian blur (5x5 kernel)

2. Create ROI mask
   └── Threshold > 15
   └── Morphological close (10x10, 3 iterations)

3. Segment each structure
   └── Apply threshold range
   └── AND with ROI mask
   └── Morphological cleanup
   └── Filter by minimum area (200px)

4. Extract features
   └── Contours
   └── Centroids
   └── Bounding boxes
   └── Areas
```

**Threshold Tables**:

| Modality | Structure | Low | High |
|----------|-----------|-----|------|
| USG | Tumor | 160 | 255 |
| USG | CSF | 0 | 40 |
| USG | Parenchyma | 50 | 150 |
| OR_CAMERA | Blood | 0 | 80 |
| OR_CAMERA | Tissue | 100 | 180 |
| OR_CAMERA | Instrument | 200 | 255 |

**Performance**:
| Metric | Value |
|--------|-------|
| Processing time | ~27ms |
| Achievable FPS | 36+ |
| Memory overhead | ~50MB |

---

### 3. ClaudeVisionAnalyzer

**Purpose**: Intelligent scene understanding via Claude API

**Request Flow**:
```
Frame (numpy) → JPEG encode → Base64 → API Request
                                           ↓
Result (dict) ← JSON parse ← Response text ← API Response
```

**Prompts by Mode**:

| Mode | Focus Areas | Output Fields |
|------|-------------|---------------|
| OR_SAFETY | Sterile field, contamination | sterile_field, contamination_risks, safety_score |
| NAVIGATION | Anatomy, proximity | structures_identified, proximity_warnings, guidance |
| TRAINING | Technique, errors | technique_assessment, errors_detected, feedback |
| INSTRUMENT | Tool identification | instruments, state, location |
| SEGMENTATION | Region boundaries | regions, thresholds, landmarks |
| FULL | All combined | Comprehensive JSON |

**Rate Limiting**:
- Default: 2 requests/second
- Configurable via `analysis_fps`
- Last analysis cached between calls

---

### 4. RealTimeVisionSystem

**Purpose**: Orchestrate all components

**Data Flow**:
```python
async def analyze_stream(self):
    while self.is_running:
        # 1. Get frame
        frame_data = self.camera.get_frame()
        
        # 2. Always run local segmentation (fast)
        masks = self.segmenter.segment_all(frame)
        
        # 3. Run Claude at interval
        if time_since_last >= analysis_interval:
            claude_result = await self.claude.analyze_frame(frame)
        
        # 4. Fuse results
        result = FrameAnalysis(
            segmentation_masks=masks,
            structures_detected=claude_result['structures'],
            ...
        )
        
        yield result
```

**Threading Model**:
```
Main Thread (async)
├── analyze_stream() - Orchestration
├── Claude API calls - Async HTTP
└── Result yielding

Capture Thread (daemon)
├── Camera read loop
└── Queue management
```

---

## Safety Architecture

### Alert Severity Levels

| Level | Response | Trigger Examples |
|-------|----------|------------------|
| CRITICAL | Voice + Visual + Log + Stop | Sterile breach, trajectory deviation |
| WARNING | Visual + Audio + Log | Approaching critical structure |
| CAUTION | Visual + Log | Suboptimal technique |
| INFO | Log only | Status updates |

### Safety Score Calculation

```python
safety_score = 100 - (
    critical_alerts * 25 +
    warning_alerts * 10 +
    caution_alerts * 5
)

# Minimum score: 0
# Maximum score: 100
```

### Redundant Checks

1. **Local segmentation** - Always runs (36+ FPS)
2. **Claude analysis** - Deep understanding (2 FPS)
3. **Proximity calculation** - Euclidean distance
4. **Zone enforcement** - Boundary checking
5. **Temporal tracking** - Movement analysis

---

## Performance Optimization

### Parallel Processing

```
Frame N:     [Capture] → [Segment] → [Display]
Frame N+1:                [Capture] → [Segment] → [Display]
Claude:      [........API Call........] → [Parse]
```

### Memory Management

| Component | Strategy |
|-----------|----------|
| Frame queue | Fixed size (30), drop oldest |
| Masks | Reuse numpy arrays |
| Claude results | Cache last result |
| Overlays | In-place modification |

### Latency Budget

| Stage | Target | Actual |
|-------|--------|--------|
| Capture | <10ms | ~5ms |
| Segmentation | <30ms | ~27ms |
| Overlay | <5ms | ~3ms |
| Display | <10ms | ~5ms |
| **Total (local)** | <55ms | ~40ms |
| Claude (async) | <600ms | ~500ms |

---

## Extension Points

### Adding New Modalities

```python
class NeuroimagingSegmenter:
    THRESHOLDS = {
        "USG": {...},
        "OR_CAMERA": {...},
        
        # Add new modality
        "CT": {
            "bone": (200, 255),
            "brain": (20, 80),
            "csf": (0, 20),
        }
    }
```

### Adding New Procedures

```python
class SurgicalTrainingSystem:
    PROCEDURE_LIBRARY = {
        "craniotomy_tumor": [...],
        
        # Add new procedure
        "endoscopic_third_ventriculostomy": [
            ProcedureStep(
                name="Burr hole placement",
                critical=True,
                safety_checks=["Kocher's point verification"]
            ),
            ...
        ]
    }
```

### Custom Robot Integration

```python
class CustomRobotController(RobotController):
    def connect(self, ip: str, port: int):
        # Implement connection
        
    def get_position(self) -> Tuple[float, float, float]:
        # Return current TCP position
        
    def move_to(self, target: Tuple[float, float, float]):
        # Execute movement
        
    def emergency_stop(self):
        # Immediate halt
```

---

## Deployment Considerations

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| GPU | None | CUDA-capable |
| Camera | 720p | 1080p+ |
| Network | 10 Mbps | 100+ Mbps |

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
NEUROVISION_LOG_LEVEL=INFO
NEUROVISION_CACHE_DIR=/tmp/neurovision
NEUROVISION_DEFAULT_CAMERA=0
NEUROVISION_CLAUDE_MODEL=claude-sonnet-4-20250514
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ /app/src/
WORKDIR /app

CMD ["python", "-m", "neurovision.cli"]
```

---

## Future Architecture

### Planned Additions

1. **MCP Server Integration**
   - navigation-system-mcp
   - surgical-video-analysis-mcp
   - training-database-mcp

2. **Voice Pipeline**
   - ElevenLabs TTS for alerts
   - Gemini Live for commands
   - Priority queue for urgent messages

3. **AR/VR Overlay**
   - HoloLens integration
   - Surgical microscope HUD
   - Heads-up navigation

4. **Federated Learning**
   - Privacy-preserving training
   - Multi-institution models
   - Continuous improvement

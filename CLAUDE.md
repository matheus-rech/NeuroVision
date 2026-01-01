# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuroVision is an AI-powered neurosurgical vision system combining Claude's vision capabilities with real-time camera processing, physics-based segmentation, and surgical robotics integration. Python 3.9+ required.

## Commands

```bash
# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"   # Install with dev dependencies
export ANTHROPIC_API_KEY="your-key"

# Run demos
python demos/examples/live_demo.py                              # Synthetic demo (no camera)
python src/vision/camera_vision_system.py --webcam              # Webcam demo
python src/vision/camera_vision_system.py --image path/to/img   # Single image
python src/vision/camera_vision_system.py --segment path/to/img # Local segmentation only

# Testing
pytest                          # Run all tests
pytest tests/test_segmentation.py -v  # Run specific test file
pytest --cov=src               # Run with coverage

# Linting & Formatting
black src/ tests/              # Format code
ruff check src/ tests/         # Lint
mypy src/                      # Type checking
```

## Architecture

```
src/
├── core/                      # System orchestration
│   └── neurosurgical_ai_platform.py  # Main AI platform (79KB)
├── vision/                    # Vision processing
│   ├── camera_vision_system.py       # Camera capture + Claude API
│   ├── claude_spatial_understanding.py
│   └── neurosurgical_spatial_understanding.py
├── robotics/                  # Surgical robotics
│   └── neurosurgical_robotics_ai.py  # ROSA/Medtronic integration
└── training/                  # Surgical training
    └── __init__.py            # Training API (implemented in core)

demos/
├── examples/live_demo.py      # Python demo
└── react/                     # React visualization components

docs/
├── architecture/              # SYSTEM_ARCHITECTURE.md, VISION_PIPELINE.md
└── api/                       # CAMERA_API.md
```

**Data Flow:**
```
Camera → OpenCV Capture → [Local Segmentation (36+ FPS) + Claude Vision API (~500ms)]
                                              ↓
                                      Analysis Fusion
                                              ↓
                            OR Safety / Navigation / Training outputs
```

## Analysis Modes

- `OR_SAFETY` - Sterile field, contamination, personnel monitoring
- `NAVIGATION` - Critical structures, trajectory guidance, proximity alerts
- `TRAINING` - Technique assessment, step validation, resident education
- `SEGMENTATION` - Tumor, vessels, CSF, parenchyma identification
- `INSTRUMENT` - Tool identification and tracking
- `FULL` - All modes combined

## Key Classes

```python
# Main entry point
from neurovision import RealTimeVisionSystem, CameraSource, AnalysisMode

# Local segmentation (no API needed)
from neurovision.vision import NeuroimagingSegmenter
```

## Performance Constraints

| Metric | Target | Notes |
|--------|--------|-------|
| Local segmentation | 27ms/frame | 36+ FPS achievable |
| Claude Vision | ~500ms | Rate-limit to ~2 FPS |
| Safety alerts | <100ms | Voice-ready messages |
| Memory baseline | ~200MB | Base system |

## MCP Server

NeuroVision includes an MCP server to expose its capabilities to Claude Desktop and other LLMs.

```bash
# Install to Claude Desktop
./mcp_server/install_to_claude_desktop.sh $ANTHROPIC_API_KEY

# Or manually run
python mcp_server/neurovision_mcp.py
```

**Available MCP Tools:**
| Tool | Description | Offline |
|------|-------------|---------|
| `analyze_image` | Full Claude Vision analysis | No |
| `segment_image` | Fast local segmentation (36+ FPS) | Yes |
| `assess_safety` | OR safety assessment | No |
| `detect_structures` | Anatomical structure detection | Partial |
| `detect_instruments` | Surgical instrument tracking | No |
| `plan_trajectory` | Trajectory planning | Yes |
| `assess_technique` | Training evaluation | No |
| `get_system_status` | Check capabilities | Yes |

## Implementation Notes

- Use async/await patterns for streaming (`async for result in system.analyze_stream()`)
- Local segmentation runs independently of Claude API for real-time performance
- Analysis fusion combines fast local results with slower Claude insights
- Training module API defined in `src/training/__init__.py`, implementation in `src/core/`

---

## Surgical Command Center Dashboard (ARIA)

The Surgical Command Center is a real-time web dashboard for neurosurgical monitoring with AI-powered voice alerts. Codename: **ARIA** (Adaptive Real-time Intelligent Assistant).

### Quick Start

```bash
# Navigate to dashboard
cd dashboard

# Copy environment template and add your API keys
cp .env.example .env
nano .env  # Add ANTHROPIC_API_KEY

# Run the demo (starts backend + frontend + opens browser)
./run_demo.sh
```

### Dashboard Architecture

```
dashboard/
├── backend/               # FastAPI + WebSocket server
│   ├── main.py           # Entry point (port 8000)
│   ├── camera_service.py # OpenCV capture
│   ├── analysis_service.py # NeuroVision integration
│   └── voice_service.py  # ARIA voice (ElevenLabs + pyttsx3)
│
├── frontend/             # React 18 + Vite
│   └── src/
│       ├── components/   # VideoFeed, BrainModel3D, AlertPanel
│       └── hooks/        # useNeuroVision, useWebSocket
│
├── .env.example          # Environment template
├── run_demo.sh           # One-click demo runner
└── README.md             # Detailed documentation
```

### Development Commands

```bash
# Backend only (for development)
cd dashboard/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend only (for development)
cd dashboard/frontend
npm run dev

# Full demo with auto-browser
./run_demo.sh

# Without opening browser
./run_demo.sh --no-browser
```

### Key Features

| Feature | Description | Technology |
|---------|-------------|------------|
| **Live Video** | Real-time camera with AI overlays | OpenCV + WebSocket |
| **Voice Alerts** | Smart prioritized voice feedback | ElevenLabs / pyttsx3 |
| **3D Brain** | Interactive trajectory visualization | Three.js / React Three Fiber |
| **Role Views** | Surgeon / Nurse / Trainee interfaces | React state management |

### Voice Priority System

```
Priority 1 (Critical): Immediate - "Stop. Contamination detected."
Priority 2 (Warning):  Within 1s - "Vessel, 4 millimeters."
Priority 3 (Navigation): Queued  - "Entering resection phase."
Priority 4 (Info):      If idle - "Tumor margin identified."
```

### WebSocket Protocol

```json
// Server → Client
{"type": "frame", "data": "base64...", "overlay": "base64...", "fps": 30}
{"type": "analysis", "safety_score": 87, "structures": [...], "phase": "resection"}
{"type": "alert", "priority": "warning", "message": "Vessel, 3mm", "speak": true}

// Client → Server
{"type": "set_role", "role": "trainee"}
{"type": "mute_voice", "muted": true}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API for vision analysis |
| `ELEVENLABS_API_KEY` | No | Premium voice (falls back to local TTS) |
| `CAMERA_SOURCE` | No | Camera index or RTSP URL (default: 0) |

### Demo Presentation Script

1. **For Administrators (2 min)**: Show role switching, safety metrics
2. **For Surgeons (3 min)**: Live video overlays, voice alerts, 3D trajectory
3. **For Academics (5 min)**: Architecture deep-dive, training mode, integration points

See `dashboard/README.md` for detailed demo script with scenarios.

# ARIA - Surgical Command Center

**Adaptive Real-time Intelligent Assistant for Neurosurgical Operations**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![Claude AI](https://img.shields.io/badge/Claude-AI%20Powered-orange.svg)](https://www.anthropic.com/)

---

## Overview

The Surgical Command Center is a real-time web dashboard designed for neurosurgical monitoring and guidance. It combines AI-powered video analysis, voice alerts, and 3D visualization to provide surgeons, nurses, and trainees with critical information during procedures.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Live Video Analysis** | Real-time AI overlays on surgical video feed |
| **Voice Alerts (ARIA)** | Intelligent voice system for safety and navigation |
| **3D Brain Visualization** | Interactive trajectory planning and structure display |
| **Role-Based Views** | Tailored interfaces for Surgeon, Nurse, and Trainee |
| **Multi-Device Support** | Wall display, workstation, and tablet responsive |

---

## System Architecture

```
                              SURGICAL COMMAND CENTER
    ___________________________________________________________________________
   |                                                                           |
   |                          FRONTEND (React 18)                              |
   |   _______________    _______________    _______________    ____________   |
   |  |               |  |               |  |               |  |            |  |
   |  |  Video Feed   |  |   3D Brain    |  |    Alerts     |  |  Metrics   |  |
   |  |  + Overlays   |  |  + Trajectory |  |    Panel      |  | Dashboard  |  |
   |  |_______________|  |_______________|  |_______________|  |____________|  |
   |         |                  |                  |                 |         |
   |         |__________________|__________________|_________________|         |
   |                                   |                                       |
   |                            WebSocket (ws://localhost:8000/ws)             |
   |___________________________________________________________________________|
                                       |
                                       v
    ___________________________________________________________________________
   |                                                                           |
   |                         BACKEND (FastAPI)                                 |
   |   _______________    _______________    _______________                   |
   |  |               |  |               |  |               |                  |
   |  | Camera Feed   |  |  NeuroVision  |  |    Voice      |                  |
   |  |   Handler     |--|   Analysis    |--|   Service     |                  |
   |  |_______________|  |_______________|  |_______________|                  |
   |         |                  |                  |                           |
   |    [OpenCV]         [Claude API]       [ElevenLabs]                       |
   |                    + Local Segm.      + pyttsx3 fallback                  |
   |___________________________________________________________________________|
                                       |
                                       v
    ___________________________________________________________________________
   |                                                                           |
   |                        DATA SOURCES                                       |
   |   _______________    _______________    _______________                   |
   |  |               |  |               |  |               |                  |
   |  |    Camera     |  |   Patient     |  |   Procedure   |                  |
   |  |    Feed       |  |    Data       |  |   Library     |                  |
   |  |_______________|  |_______________|  |_______________|                  |
   |                                                                           |
   |___________________________________________________________________________|
```

### Component Details

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18, Tailwind CSS, Three.js | User interface and visualization |
| **Backend** | FastAPI, WebSocket | Real-time data streaming and AI coordination |
| **Vision** | OpenCV, Claude API | Camera capture and intelligent analysis |
| **Voice** | ElevenLabs, pyttsx3 | Natural voice alerts with fallback |
| **3D Render** | React Three Fiber | Interactive brain model and trajectory |

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Anthropic API key
- (Optional) ElevenLabs API key for premium voice
- (Optional) Webcam for live video

### 1. Environment Setup

```bash
# Navigate to dashboard directory
cd dashboard

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### 2. Install Dependencies

```bash
# Backend (from dashboard/backend)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend (from dashboard/frontend)
cd ../frontend
npm install
```

### 3. Run the Dashboard

```bash
# Option 1: Use the demo script (recommended)
./run_demo.sh

# Option 2: Run manually
# Terminal 1 - Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 4. Access the Dashboard

Open your browser to: **http://localhost:5173**

---

## Demo Script

Follow this script for a compelling presentation to stakeholders:

### For Administrators (2 minutes)

1. **Open Dashboard** on large display
   - "This is ARIA - our AI-powered surgical command center"

2. **Show Role Selector**
   - "Each user sees a tailored view based on their role"
   - Switch between Surgeon/Nurse/Trainee views

3. **Highlight Metrics**
   - "Real-time safety scoring and phase tracking"
   - Point to safety percentage and procedure phase indicator

### For Surgeons (3 minutes)

1. **Live Video Feed**
   - "AI overlays identify critical structures in real-time"
   - Show tumor, vessel, and instrument highlighting

2. **Voice Alerts Demo**
   - Trigger a proximity warning
   - "ARIA speaks: 'Vessel, 3 millimeters'"
   - "Voice alerts are prioritized - critical alerts are never delayed"

3. **3D Trajectory View**
   - Show planned trajectory on brain model
   - "Real-time depth tracking during navigation"

### For Academics (5 minutes)

1. **Technical Architecture**
   - Show architecture diagram in README
   - "Hybrid processing: 36+ FPS local + 2 FPS Claude Vision"

2. **Training Mode Features**
   - Switch to Trainee role
   - "Technique scoring and step-by-step guidance"
   - Show assessment metrics

3. **Integration Points**
   - "Compatible with ROSA, Medtronic, BrainLab systems"
   - Discuss API and MCP server integration

### Demo Scenarios

| Scenario | Action | Expected Result |
|----------|--------|-----------------|
| **Contamination** | Simulate sterile break | Red flash, ARIA: "Stop. Contamination detected." |
| **Proximity** | Approach vessel | Yellow alert, ARIA: "Vessel, 4 millimeters" |
| **Phase Change** | Complete step | Green indicator, ARIA: "Entering resection phase" |
| **Training Tip** | Poor technique | Trainee-only: coaching suggestion appears |

---

## UI Layout

```
+------------------------------------------------------------------------+
|  ARIA - Surgical Command Center              [Surgeon v] [Volume] [Cog]|
+--------------------------------+---------------------------------------+
|                                |                                       |
|     LIVE VIDEO FEED            |         3D BRAIN MODEL                |
|     [AI Overlays Active]       |         [Trajectory View]             |
|                                |                                       |
|     Tumor: Highlighted         |         Entry: Marked                 |
|     Vessels: Red outlines      |         Target: 23.5mm depth          |
|     Instruments: Tracked       |         Safety corridor: Green        |
|                                |                                       |
+--------------------------------+---------------------------------------+
|  ALERTS                        |  METRICS                              |
|  [!] Vessel proximity: 3.2mm   |  Safety:  [========--] 87%            |
|  [OK] Sterile field: Clear     |  Phase:   Resection (4/8)             |
|  [i] Motor cortex identified   |  Time:    02:34:15                    |
+--------------------------------+---------------------------------------+
```

### Role-Based Differences

| Element | Surgeon View | Nurse View | Trainee View |
|---------|--------------|------------|--------------|
| Video Size | 70% screen | 50% screen | 50% screen |
| 3D Model | Minimal | Hidden | Full interactive |
| Alerts | Critical only | All alerts | All + explanations |
| Metrics | Safety score | Full dashboard | + Technique score |
| Voice | Safety alerts | All alerts | + Coaching tips |

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API for vision analysis |
| `ELEVENLABS_API_KEY` | No | Premium voice synthesis |
| `CAMERA_SOURCE` | No | Camera index or RTSP URL (default: 0) |
| `VOICE_ENABLED` | No | Enable/disable voice (default: true) |
| `DEBUG_MODE` | No | Enable debug logging (default: false) |

### Voice System Configuration

```python
# Voice priority levels
VOICE_CONFIG = {
    "critical": {
        "priority": 1,
        "delay_ms": 0,
        "always_speak": True
    },
    "warning": {
        "priority": 2,
        "delay_ms": 100,
        "throttle_seconds": 5
    },
    "navigation": {
        "priority": 3,
        "delay_ms": 500,
        "queue": True
    },
    "info": {
        "priority": 4,
        "delay_ms": 1000,
        "speak_when_idle": True
    }
}
```

---

## WebSocket Protocol

### Server to Client Messages

```json
// Video frame with overlay
{"type": "frame", "data": "base64...", "overlay": "base64...", "fps": 30}

// Analysis results
{"type": "analysis", "safety_score": 87, "structures": [...], "phase": "resection"}

// Voice alert
{"type": "alert", "priority": "warning", "message": "Vessel, 3mm", "speak": true}

// Trajectory update
{"type": "trajectory", "entry": [0,0,50], "target": [30,20,80], "depth_mm": 23.5}
```

### Client to Server Messages

```json
// Change user role
{"type": "set_role", "role": "trainee"}

// Mute voice
{"type": "mute_voice", "muted": true}

// Change analysis mode
{"type": "set_mode", "mode": "navigation"}
```

---

## Development

### Project Structure

```
dashboard/
+-- backend/
|   +-- main.py              # FastAPI application entry
|   +-- camera_service.py    # Camera capture and streaming
|   +-- analysis_service.py  # NeuroVision integration
|   +-- voice_service.py     # ARIA voice system
|   +-- websocket_handler.py # Real-time communication
|   +-- requirements.txt     # Python dependencies
|
+-- frontend/
|   +-- src/
|   |   +-- App.jsx
|   |   +-- components/
|   |   |   +-- VideoFeed.jsx
|   |   |   +-- BrainModel3D.jsx
|   |   |   +-- AlertPanel.jsx
|   |   |   +-- MetricsDashboard.jsx
|   |   |   +-- RoleSelector.jsx
|   |   +-- hooks/
|   |   |   +-- useNeuroVision.js
|   |   |   +-- useWebSocket.js
|   |   +-- styles/
|   +-- package.json
|   +-- vite.config.js
|   +-- tailwind.config.js
|
+-- .env.example
+-- run_demo.sh
+-- README.md
```

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# The build output will be in frontend/dist/
# Serve with any static file server or integrate with backend
```

---

## Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| No video feed | Camera not detected | Check `CAMERA_SOURCE` in .env |
| No voice alerts | ElevenLabs API issue | Will fallback to pyttsx3 automatically |
| WebSocket disconnect | Backend not running | Start backend: `uvicorn main:app --port 8000` |
| Slow analysis | Rate limiting | Analysis runs at 2 FPS by design |
| 3D model not loading | Three.js issue | Check browser WebGL support |

### Debug Mode

```bash
# Enable debug logging
export DEBUG_MODE=true
./run_demo.sh

# Check backend logs
tail -f backend/logs/app.log

# Check frontend console
# Open browser DevTools (F12) -> Console
```

### Performance Optimization

```yaml
# For lower-powered devices:
vision:
  analysis_fps: 1          # Reduce Claude API calls
  capture_fps: 15          # Lower capture rate
  resolution: [640, 480]   # Reduce resolution

# For high-performance displays:
vision:
  analysis_fps: 2          # Maximum Claude rate
  capture_fps: 30          # Full capture rate
  resolution: [1920, 1080] # Full HD
```

---

## API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | System status and capabilities |
| `/api/settings` | GET/POST | User settings management |
| `/api/procedures` | GET | Available procedure library |

### WebSocket Endpoint

- **URL**: `ws://localhost:8000/ws`
- **Protocol**: JSON messages
- **Heartbeat**: 30 seconds

---

## Security Considerations

- API keys are stored in `.env` (never commit to git)
- WebSocket connections are local-only by default
- No patient data is transmitted to external APIs
- All Claude API calls use anonymized frame data

---

## License

This project is part of NeuroVision and is licensed under the MIT License.

---

## Contact

**Dr. Matheus Machado Rech, M.D.**
- GitHub: [@matheus-rech](https://github.com/matheus-rech)
- Research: Cerebellar stroke, AI/ML in healthcare

---

<p align="center">
  <strong>ARIA - Intelligent Surgical Assistance for the Modern OR</strong>
</p>

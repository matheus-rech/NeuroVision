# Surgical Command Center - Design Document

**Date:** 2025-01-01
**Status:** Approved
**Author:** Claude (with Dr. Matheus Machado Rech)

## Overview

A real-time web dashboard for surgical monitoring with AI-powered voice alerts. Codename: **ARIA** (Adaptive Real-time Intelligent Assistant).

### Goals
- Impress multiple audiences: administrators, surgeons, tech conferences, academics
- Role-based views for Surgeon, Nurse, and Trainee
- Multi-device support: wall display, workstation, tablet
- Voice alerts for safety and navigation guidance

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐  │
│  │ Video Feed  │ │  3D Brain   │ │   Alerts    │ │    Scores    │  │
│  │ + Overlays  │ │ + Trajectory│ │   Panel     │ │   Dashboard  │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬───────┘  │
│         └───────────────┴───────────────┴───────────────┘          │
│                              WebSocket                              │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                      BACKEND (FastAPI)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Camera Feed  │  │  NeuroVision │  │    Voice     │              │
│  │   Handler    │──│   Analysis   │──│   Service    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│         │                  │                  │                     │
│    OpenCV            Claude API +        ElevenLabs +               │
│                    Local Segmentation    pyttsx3 fallback           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## UI Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  ARIA - Surgical Command Center          [Surgeon ▼] [🔊] [⚙️]    │
├────────────────────────────────┬───────────────────────────────────┤
│                                │                                   │
│     LIVE VIDEO FEED            │      3D BRAIN MODEL               │
│     with AI overlays           │      with trajectory              │
│                                │                                   │
├────────────────────────────────┴───────────────────────────────────┤
│  ALERTS                              │  METRICS                    │
│  ⚠️ Vessel proximity: 3.2mm         │  Safety: ████████░░ 87%     │
│  ✓ Sterile field: Clear             │  Phase: Resection (4/8)     │
└──────────────────────────────────────┴─────────────────────────────┘
```

### Role Differences

| Element | Surgeon | Nurse | Trainee |
|---------|---------|-------|---------|
| Video size | 70% | 50% | 50% |
| 3D Model | Minimal | Hidden | Full |
| Alerts | Critical only | All alerts | All + explanations |
| Metrics | Safety score | Full dashboard | + Technique score |
| Voice | Safety alerts | All alerts | + Coaching tips |

---

## Voice Alert System (ARIA)

**Personality:** Professional, calm, concise - like an experienced OR nurse.

### Alert Priority

| Priority | Trigger | Voice Behavior | Example |
|----------|---------|----------------|---------|
| 🔴 Critical | Contamination, <2mm | Immediate | "Stop. Contamination detected." |
| 🟠 Warning | 2-5mm proximity | Within 1s | "Vessel, 4 millimeters." |
| 🟡 Navigation | Phase change | Queued | "Entering resection phase." |
| 🟢 Info | Structure identified | If idle | "Tumor margin identified." |

### Fallback Logic
```
ElevenLabs API (300ms timeout)
  ├─ Success → High-quality audio
  └─ Fail → Local TTS (pyttsx3) - never silent on critical
```

### Smart Throttling
- No repeat within 5 seconds
- Groups similar alerts
- Role-based filtering

---

## WebSocket Messages

### Server → Client

```json
{"type": "frame", "data": "base64...", "overlay": "base64...", "fps": 30}
{"type": "analysis", "safety_score": 87, "structures": [...], "phase": "resection"}
{"type": "alert", "priority": "warning", "message": "Vessel, 3mm", "speak": true}
{"type": "trajectory", "entry": [0,0,50], "target": [30,20,80], "depth_mm": 23.5}
```

### Client → Server

```json
{"type": "set_role", "role": "trainee"}
{"type": "mute_voice", "muted": true}
{"type": "set_mode", "mode": "navigation"}
```

---

## Tech Stack

### Backend
- FastAPI (async, WebSocket native)
- OpenCV (camera capture)
- NeuroVision (existing segmentation)
- ElevenLabs SDK + pyttsx3 fallback

### Frontend
- React 18 with hooks
- Tailwind CSS (responsive)
- react-use-websocket
- Three.js / React Three Fiber (3D)
- Recharts (gauges)

---

## File Structure

```
dashboard/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── camera_service.py    # Camera capture
│   ├── analysis_service.py  # NeuroVision integration
│   ├── voice_service.py     # ARIA voice
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── VideoFeed.jsx
│   │   │   ├── BrainModel3D.jsx
│   │   │   ├── AlertPanel.jsx
│   │   │   ├── MetricsDashboard.jsx
│   │   │   └── RoleSelector.jsx
│   │   ├── hooks/
│   │   │   └── useNeuroVision.js
│   │   └── styles/
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

---

## Demo Script

1. Open on wall display - Surgeon view, full screen
2. Show live video with AI overlays
3. Trigger proximity warning - ARIA speaks
4. Switch to Trainee view - UI transforms
5. Show 3D trajectory - rotate brain model
6. Simulate contamination - red flash, voice alert
7. Open on tablet - responsive layout

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
CAMERA_SOURCE=0
```

---

## Success Criteria

- [ ] Live video streaming at 30 FPS
- [ ] AI overlays updating at 2 FPS (Claude Vision rate)
- [ ] Voice alerts with <500ms latency
- [ ] Role switching transforms UI instantly
- [ ] Works on wall display, workstation, and tablet
- [ ] Graceful fallback when APIs unavailable

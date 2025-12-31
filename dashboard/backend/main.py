#!/usr/bin/env python3
"""
ARIA - Surgical Command Center Backend
=======================================

FastAPI application providing real-time WebSocket streaming for the
NeuroVision Surgical Command Center dashboard.

Features:
- WebSocket streaming for video frames and analysis
- REST API for configuration and status
- Integration with camera, analysis, and voice services
- Role-based alert filtering

Run:
    uvicorn main:app --reload --port 8000

API Docs:
    http://localhost:8000/docs

WebSocket:
    ws://localhost:8000/ws
"""

import asyncio
import json
import os
import time
import random
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)
except ImportError:
    pass

# Configuration from environment
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
VOICE_ENABLED = os.getenv("VOICE_ENABLED", "true").lower() == "true"


class AlertPriority:
    """Alert priority levels."""
    CRITICAL = 1
    WARNING = 2
    NAVIGATION = 3
    INFO = 4


class ClientConnection:
    """Represents a connected WebSocket client."""

    def __init__(self, websocket: WebSocket, client_id: str):
        self.websocket = websocket
        self.client_id = client_id
        self.role: str = "surgeon"
        self.muted: bool = False
        self.analysis_mode: str = "FULL"
        self.connected_at: datetime = datetime.now()

    def should_receive_alert(self, priority: int) -> bool:
        """Determine if client should receive alert based on role."""
        if self.muted:
            return False
        if self.role == "surgeon":
            return priority == AlertPriority.CRITICAL
        return True


# Connected WebSocket clients
connected_clients: Dict[str, ClientConnection] = {}


# Pydantic models
class StatusResponse(BaseModel):
    service: str = "ARIA Surgical Command Center"
    version: str = "1.0.0"
    uptime_seconds: float
    camera_status: str
    analysis_status: str
    voice_status: str
    connected_clients: int
    capabilities: Dict[str, bool]


class AlertRequest(BaseModel):
    priority: str = "warning"
    message: str
    speak: bool = True


startup_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    print("\n" + "=" * 50)
    print("ARIA - Surgical Command Center Starting...")
    print("=" * 50)
    print(f"\nAPI Docs: http://localhost:{BACKEND_PORT}/docs")
    print(f"WebSocket: ws://localhost:{BACKEND_PORT}/ws")
    print("=" * 50 + "\n")
    yield
    print("\n[Shutdown] ARIA shutting down. Goodbye!")


app = FastAPI(
    title="ARIA - Surgical Command Center",
    description="Real-time AI-powered neurosurgical monitoring backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# REST API Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ARIA"}


@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """Get comprehensive system status."""
    return StatusResponse(
        uptime_seconds=time.time() - startup_time,
        camera_status="synthetic",
        analysis_status="active",
        voice_status="active" if VOICE_ENABLED else "disabled",
        connected_clients=len(connected_clients),
        capabilities={
            "video_feed": True,
            "ai_analysis": True,
            "voice_alerts": VOICE_ENABLED,
            "3d_visualization": True,
            "role_switching": True,
            "training_mode": True
        }
    )


@app.get("/api/roles")
async def get_available_roles():
    """Get available user roles."""
    return {
        "roles": [
            {"id": "surgeon", "name": "Surgeon", "description": "Critical alerts only", "video_size": "70%"},
            {"id": "nurse", "name": "Nurse", "description": "All alerts", "video_size": "50%"},
            {"id": "trainee", "name": "Trainee", "description": "All + coaching", "video_size": "50%"}
        ]
    }


@app.get("/api/procedures")
async def get_procedures():
    """Get available surgical procedures."""
    return {
        "procedures": [
            {"id": "craniotomy_tumor", "name": "Craniotomy for Tumor Resection", "phases": 8},
            {"id": "transsphenoidal", "name": "Transsphenoidal Pituitary Surgery", "phases": 6},
            {"id": "dbs_placement", "name": "Deep Brain Stimulation", "phases": 6}
        ]
    }


@app.post("/api/alert")
async def trigger_alert(request: AlertRequest):
    """Manually trigger an alert (for demo)."""
    priority_map = {"critical": 1, "warning": 2, "navigation": 3, "info": 4}
    priority = priority_map.get(request.priority.lower(), 4)

    alert_message = {
        "type": "alert",
        "priority": request.priority,
        "message": request.message,
        "speak": request.speak,
        "timestamp": datetime.now().isoformat()
    }

    for client in connected_clients.values():
        if client.should_receive_alert(priority):
            try:
                await client.websocket.send_json(alert_message)
            except:
                pass

    return {"status": "sent", "recipients": len(connected_clients)}


# =============================================================================
# WebSocket Streaming
# =============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time streaming."""
    await websocket.accept()

    client_id = f"client_{int(time.time() * 1000)}"
    client = ClientConnection(websocket, client_id)
    connected_clients[client_id] = client

    print(f"[WS] Client {client_id} connected (total: {len(connected_clients)})")

    await websocket.send_json({
        "type": "connected",
        "client_id": client_id,
        "message": "Welcome to ARIA Surgical Command Center"
    })

    try:
        streaming_task = asyncio.create_task(stream_data(client))
        receive_task = asyncio.create_task(receive_messages(client))

        done, pending = await asyncio.wait(
            [streaming_task, receive_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        print(f"[WS] Client {client_id} disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")
    finally:
        if client_id in connected_clients:
            del connected_clients[client_id]


async def stream_data(client: ClientConnection):
    """Stream synthetic data to client."""
    phases = ["preparation", "approach", "resection", "hemostasis", "closure"]
    phase_idx = 0

    while True:
        try:
            # Synthetic analysis data
            safety_score = random.randint(75, 98)
            
            analysis_message = {
                "type": "analysis",
                "safety_score": safety_score,
                "phase": phases[phase_idx % len(phases)],
                "phase_number": (phase_idx % len(phases)) + 1,
                "total_phases": len(phases),
                "structures": [
                    {"name": "tumor_margin", "proximity_mm": round(random.uniform(2, 10), 1), "status": "visible"},
                    {"name": "vessel", "proximity_mm": round(random.uniform(3, 15), 1), "status": "mapped"},
                    {"name": "motor_cortex", "proximity_mm": round(random.uniform(5, 20), 1), "status": "protected"}
                ],
                "instruments": [
                    {"name": "bipolar", "status": random.choice(["in_use", "ready"])},
                    {"name": "suction", "status": random.choice(["in_use", "ready"])},
                    {"name": "microscope", "status": "active"}
                ],
                "trajectory": {
                    "entry": [0, 0, 50],
                    "target": [30, 20, 80],
                    "depth_mm": round(random.uniform(20, 35), 1),
                    "status": "on_trajectory"
                },
                "timestamp": datetime.now().isoformat()
            }

            await client.websocket.send_json(analysis_message)

            # Random alerts
            if random.random() > 0.95:
                vessel_proximity = round(random.uniform(2, 5), 1)
                alert_message = {
                    "type": "alert",
                    "priority": "warning",
                    "message": f"Vessel proximity: {vessel_proximity}mm",
                    "speak": True,
                    "timestamp": datetime.now().isoformat()
                }
                if client.should_receive_alert(AlertPriority.WARNING):
                    await client.websocket.send_json(alert_message)

            # Occasionally advance phase
            if random.random() > 0.99:
                phase_idx += 1

            await asyncio.sleep(0.5)

        except asyncio.CancelledError:
            break
        except Exception as e:
            if DEBUG_MODE:
                print(f"[Stream] Error: {e}")
            await asyncio.sleep(0.1)


async def receive_messages(client: ClientConnection):
    """Receive messages from client."""
    while True:
        try:
            data = await client.websocket.receive_json()
            message_type = data.get("type")

            if message_type == "set_role":
                role = data.get("role", "surgeon")
                if role in ["surgeon", "nurse", "trainee"]:
                    client.role = role
                    await client.websocket.send_json({"type": "role_changed", "role": role})
                    print(f"[WS] Client {client.client_id} role -> {role}")

            elif message_type == "mute_voice":
                client.muted = data.get("muted", False)
                await client.websocket.send_json({"type": "mute_changed", "muted": client.muted})

            elif message_type == "set_mode":
                client.analysis_mode = data.get("mode", "FULL")
                await client.websocket.send_json({"type": "mode_changed", "mode": client.analysis_mode})

            elif message_type == "ping":
                await client.websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})

        except asyncio.CancelledError:
            break
        except WebSocketDisconnect:
            break
        except Exception as e:
            if DEBUG_MODE:
                print(f"[Receive] Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=DEBUG_MODE)

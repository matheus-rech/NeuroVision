#!/bin/bash
#
# ARIA - Surgical Command Center Demo Runner
# ============================================
# Starts both backend (FastAPI) and frontend (Vite) servers
# for the NeuroVision Surgical Command Center dashboard.
#
# Usage:
#   ./run_demo.sh              # Start both servers
#   ./run_demo.sh --backend    # Start backend only
#   ./run_demo.sh --frontend   # Start frontend only
#   ./run_demo.sh --help       # Show this help
#
# Ports:
#   Backend:  http://localhost:8000
#   Frontend: http://localhost:5173
#

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# PID files for cleanup
BACKEND_PID_FILE="/tmp/aria_backend.pid"
FRONTEND_PID_FILE="/tmp/aria_frontend.pid"

# ============================================
# Helper Functions
# ============================================

print_banner() {
    echo -e "${PURPLE}"
    echo "  ___  ____  ___ ___"
    echo " / _ \| _  \|_ _/ _ \ "
    echo "| |_| |    / | | |_| |"
    echo "|  _  |  _ \ | |  _  |"
    echo "|_| |_|_| \_\___|_| |_|"
    echo ""
    echo -e "${CYAN}Surgical Command Center${NC}"
    echo -e "${NC}NeuroVision Dashboard Demo"
    echo "=========================================="
    echo ""
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_env() {
    if [ -f "$SCRIPT_DIR/.env" ]; then
        print_status "Loading environment from .env"
        export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
    elif [ -f "$SCRIPT_DIR/.env.example" ]; then
        print_warning ".env file not found. Using .env.example"
        print_warning "Copy .env.example to .env and add your API keys"
    fi

    # Check for required API key
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        print_warning "ANTHROPIC_API_KEY not set. Some features will be limited."
        print_status "Set it in .env or export ANTHROPIC_API_KEY='your-key'"
    else
        print_success "ANTHROPIC_API_KEY detected"
    fi

    # Optional keys
    if [ -z "$ELEVENLABS_API_KEY" ]; then
        print_status "ELEVENLABS_API_KEY not set. Using local TTS fallback."
    else
        print_success "ELEVENLABS_API_KEY detected (premium voice enabled)"
    fi
}

check_dependencies() {
    print_status "Checking dependencies..."

    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        print_success "Python $PYTHON_VERSION found"
    else
        print_error "Python 3 is required but not installed"
        exit 1
    fi

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION found"
    else
        print_error "Node.js is required but not installed"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION found"
    else
        print_error "npm is required but not installed"
        exit 1
    fi
}

install_backend_deps() {
    print_status "Setting up backend..."

    cd "$BACKEND_DIR"

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Install dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        print_status "Installing backend dependencies..."
        pip install -q -r requirements.txt
    else
        print_warning "No requirements.txt found. Installing default packages..."
        pip install -q fastapi uvicorn python-dotenv opencv-python anthropic websockets pyttsx3
    fi

    print_success "Backend setup complete"
}

install_frontend_deps() {
    print_status "Setting up frontend..."

    cd "$FRONTEND_DIR"

    # Install npm dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install --silent
    fi

    print_success "Frontend setup complete"
}

start_backend() {
    print_status "Starting backend server on port $BACKEND_PORT..."

    cd "$BACKEND_DIR"

    # Activate virtual environment
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    # Check if main.py exists
    if [ ! -f "main.py" ]; then
        print_warning "main.py not found. Creating placeholder..."
        create_backend_placeholder
    fi

    # Start uvicorn in background
    uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"

    # Wait for backend to be ready
    sleep 2

    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_success "Backend running at http://localhost:$BACKEND_PORT"
    else
        print_error "Backend failed to start"
        exit 1
    fi
}

start_frontend() {
    print_status "Starting frontend server on port $FRONTEND_PORT..."

    cd "$FRONTEND_DIR"

    # Start Vite in background
    npm run dev -- --port $FRONTEND_PORT &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

    # Wait for frontend to be ready
    sleep 3

    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_success "Frontend running at http://localhost:$FRONTEND_PORT"
    else
        print_error "Frontend failed to start"
        exit 1
    fi
}

create_backend_placeholder() {
    cat > main.py << 'PLACEHOLDER'
"""
ARIA - Surgical Command Center Backend
Placeholder for demo purposes
"""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import random

app = FastAPI(
    title="ARIA - Surgical Command Center",
    description="Real-time AI-powered neurosurgical monitoring",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ARIA Backend"}

@app.get("/api/status")
async def status():
    return {
        "system": "ARIA Surgical Command Center",
        "version": "1.0.0",
        "capabilities": {
            "video_feed": True,
            "ai_analysis": True,
            "voice_alerts": True,
            "3d_visualization": True
        }
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Simulate real-time data
            data = {
                "type": "analysis",
                "safety_score": random.randint(75, 98),
                "phase": random.choice(["preparation", "approach", "resection", "closure"]),
                "structures": [
                    {"name": "tumor_margin", "proximity_mm": random.uniform(2, 10)},
                    {"name": "vessel", "proximity_mm": random.uniform(3, 15)}
                ],
                "alerts": []
            }

            # Random alert
            if random.random() > 0.9:
                data["alerts"].append({
                    "priority": "warning",
                    "message": f"Vessel proximity: {random.uniform(2, 5):.1f}mm"
                })

            await websocket.send_json(data)
            await asyncio.sleep(0.5)
    except Exception as e:
        print(f"WebSocket disconnected: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
PLACEHOLDER

    # Also create requirements.txt if missing
    cat > requirements.txt << 'REQS'
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
python-dotenv>=1.0.0
opencv-python>=4.8.0
anthropic>=0.18.0
websockets>=11.0
pyttsx3>=2.90
httpx>=0.24.0
numpy>=1.24.0
REQS
}

open_browser() {
    local url="http://localhost:$FRONTEND_PORT"
    print_status "Opening browser at $url"

    # Wait a moment for servers to fully initialize
    sleep 2

    # Detect OS and open browser
    case "$(uname -s)" in
        Darwin)     open "$url" ;;
        Linux)      xdg-open "$url" 2>/dev/null || sensible-browser "$url" ;;
        CYGWIN*|MINGW*|MSYS*) start "$url" ;;
        *)          print_warning "Could not detect OS. Please open $url manually." ;;
    esac
}

cleanup() {
    echo ""
    print_status "Shutting down servers..."

    # Kill backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID 2>/dev/null
            print_status "Backend stopped"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi

    # Kill frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID 2>/dev/null
            print_status "Frontend stopped"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi

    # Kill any remaining processes on our ports
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

    print_success "Cleanup complete. Goodbye!"
    exit 0
}

show_help() {
    echo "ARIA - Surgical Command Center Demo Runner"
    echo ""
    echo "Usage: ./run_demo.sh [options]"
    echo ""
    echo "Options:"
    echo "  --backend     Start backend server only"
    echo "  --frontend    Start frontend server only"
    echo "  --no-browser  Don't auto-open browser"
    echo "  --help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ANTHROPIC_API_KEY    Required for AI analysis"
    echo "  ELEVENLABS_API_KEY   Optional for premium voice"
    echo "  CAMERA_SOURCE        Camera index or RTSP URL (default: 0)"
    echo ""
    echo "Examples:"
    echo "  ./run_demo.sh                  # Start full demo"
    echo "  ./run_demo.sh --backend        # Backend only for development"
    echo "  ./run_demo.sh --no-browser     # Start without opening browser"
    echo ""
}

# ============================================
# Main Execution
# ============================================

# Set up cleanup on exit
trap cleanup SIGINT SIGTERM

# Parse arguments
RUN_BACKEND=true
RUN_FRONTEND=true
OPEN_BROWSER=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend)
            RUN_FRONTEND=false
            shift
            ;;
        --frontend)
            RUN_BACKEND=false
            shift
            ;;
        --no-browser)
            OPEN_BROWSER=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
print_banner
check_dependencies
check_env

# Change to script directory
cd "$SCRIPT_DIR"

# Install dependencies and start servers
if [ "$RUN_BACKEND" = true ]; then
    install_backend_deps
    start_backend
fi

if [ "$RUN_FRONTEND" = true ]; then
    install_frontend_deps
    start_frontend
fi

# Open browser
if [ "$OPEN_BROWSER" = true ] && [ "$RUN_FRONTEND" = true ]; then
    open_browser
fi

# Print final status
echo ""
echo "=========================================="
print_success "ARIA Surgical Command Center is running!"
echo ""
if [ "$RUN_BACKEND" = true ]; then
    echo -e "  Backend:  ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "  API Docs: ${CYAN}http://localhost:$BACKEND_PORT/docs${NC}"
fi
if [ "$RUN_FRONTEND" = true ]; then
    echo -e "  Frontend: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
fi
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all servers"
echo "=========================================="

# Keep script running
wait

#!/bin/bash
# Install NeuroVision MCP Server to Claude Desktop
# Usage: ./install_to_claude_desktop.sh [ANTHROPIC_API_KEY]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Get API key from argument or environment
API_KEY="${1:-$ANTHROPIC_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "Warning: No ANTHROPIC_API_KEY provided. Claude Vision features will be disabled."
    echo "Usage: $0 [ANTHROPIC_API_KEY]"
    API_KEY=""
fi

# Create config directory if it doesn't exist
mkdir -p "$(dirname "$CONFIG_FILE")"

# Check if config file exists
if [ -f "$CONFIG_FILE" ]; then
    echo "Existing config found. Backing up to claude_desktop_config.json.bak"
    cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"

    # Use Python to merge configs
    python3 << EOF
import json
import os

config_file = os.path.expanduser("$CONFIG_FILE")
api_key = "$API_KEY"
server_path = "$SCRIPT_DIR/neurovision_mcp.py"

# Load existing config
with open(config_file, 'r') as f:
    config = json.load(f)

# Ensure mcpServers exists
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Add/update neurovision server
venv_python = os.path.join(os.path.dirname(server_path), "..", "venv", "bin", "python")
if os.path.exists(venv_python):
    python_cmd = venv_python
else:
    python_cmd = "python"

config['mcpServers']['neurovision'] = {
    "command": python_cmd,
    "args": [server_path],
    "env": {"ANTHROPIC_API_KEY": api_key} if api_key else {}
}

# Save updated config
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)

print(f"✓ Added neurovision server to {config_file}")
EOF

else
    # Create new config file
    python3 << EOF
import json
import os

config_file = os.path.expanduser("$CONFIG_FILE")
api_key = "$API_KEY"
server_path = "$SCRIPT_DIR/neurovision_mcp.py"

config = {
    "mcpServers": {
        "neurovision": {
            "command": "python",
            "args": [server_path],
            "env": {"ANTHROPIC_API_KEY": api_key} if api_key else {}
        }
    }
}

with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)

print(f"✓ Created new config at {config_file}")
EOF
fi

echo ""
echo "NeuroVision MCP Server installed!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. The 'neurovision' tools will be available in Claude"
echo ""
echo "Available tools:"
echo "  - analyze_image      : Full Claude Vision analysis"
echo "  - segment_image      : Fast local segmentation (no API)"
echo "  - assess_safety      : OR safety assessment"
echo "  - detect_structures  : Anatomical structure detection"
echo "  - detect_instruments : Surgical instrument tracking"
echo "  - plan_trajectory    : Trajectory planning (no API)"
echo "  - assess_technique   : Training evaluation"
echo "  - list_analysis_modes: Available modes"
echo "  - get_system_status  : Check capabilities"

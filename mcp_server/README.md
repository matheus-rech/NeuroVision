# NeuroVision MCP Server

MCP (Model Context Protocol) server that exposes NeuroVision's AI-powered neurosurgical vision capabilities to LLMs like Claude.

## Tools Available

| Tool | Description | API Required |
|------|-------------|--------------|
| `analyze_image` | Full Claude Vision analysis of surgical images | Yes |
| `segment_image` | Fast local segmentation (36+ FPS) | No |
| `assess_safety` | OR safety assessment | Yes |
| `detect_structures` | Identify anatomical structures | Optional |
| `detect_instruments` | Track surgical instruments | Yes |
| `plan_trajectory` | Surgical trajectory planning | No |
| `assess_technique` | Training/certification evaluation | Yes |
| `list_analysis_modes` | List available analysis modes | No |
| `get_system_status` | Check system capabilities | No |

## Installation

### 1. Install Dependencies

```bash
cd /Users/matheusrech/Downloads/NeuroVision
pip install -e .
pip install mcp
```

### 2. Set Environment Variables

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

### 3. Add to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "neurovision": {
      "command": "python",
      "args": ["/Users/matheusrech/Downloads/NeuroVision/mcp_server/neurovision_mcp.py"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After adding the configuration, restart Claude Desktop to load the MCP server.

## Usage Examples

### Analyze a Surgical Image
```
Use the analyze_image tool to analyze /path/to/surgical_scene.png in full mode
```

### Fast Local Segmentation (No API needed)
```
Use segment_image to segment /path/to/brain_mri.png and save overlay to /tmp/segmented.png
```

### Plan a Surgical Trajectory
```
Use plan_trajectory to plan a path from entry (0, 0, 50) to target (30, 20, 80) with 3mm safety margin
```

### Check System Status
```
Use get_system_status to see what capabilities are available
```

## Offline Mode

The following tools work completely offline without any API key:
- `segment_image` - Physics-based segmentation at 36+ FPS
- `plan_trajectory` - Trajectory planning with safety corridors
- `list_analysis_modes` - List available modes
- `get_system_status` - Check capabilities

## Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| Local segmentation | ~27ms | 36+ FPS capable |
| Claude Vision analysis | ~500ms | Requires API |
| Trajectory planning | <5ms | Pure computation |

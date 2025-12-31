import { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, Camera, CameraOff, Crosshair } from 'lucide-react';

/**
 * Video feed component with AI overlay rendering
 * Displays real-time surgical video with detected structures and annotations
 */
export function VideoFeed({
  frame,
  overlays = [],
  frameRate = 0,
  isFullscreen = false,
  onToggleFullscreen,
  role = 'surgeon',
  className = '',
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // Draw overlays on canvas
  useEffect(() => {
    if (!canvasRef.current || !overlays.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;

    if (!container) return;

    // Match canvas size to container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear previous overlays
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each overlay
    overlays.forEach(overlay => {
      const { type, data, color = '#10b981', label } = overlay;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillStyle = color + '40'; // 25% opacity fill

      switch (type) {
        case 'bbox':
          // Bounding box
          const [x, y, w, h] = data;
          ctx.strokeRect(x, y, w, h);
          if (label) {
            ctx.font = '12px Inter, sans-serif';
            ctx.fillStyle = color;
            ctx.fillRect(x, y - 20, ctx.measureText(label).width + 8, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x + 4, y - 6);
          }
          break;

        case 'contour':
          // Polygon contour
          if (data.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(data[0][0], data[0][1]);
          data.forEach(([px, py]) => ctx.lineTo(px, py));
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
          break;

        case 'point':
          // Point marker
          const [px, py] = data;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (label) {
            ctx.font = '11px Inter, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, px + 10, py + 4);
          }
          break;

        case 'line':
          // Line segment
          const [x1, y1, x2, y2] = data;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          break;

        case 'trajectory':
          // Surgical trajectory with entry/target
          const { entry, target, current } = data;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(entry[0], entry[1]);
          ctx.lineTo(target[0], target[1]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Entry point (green)
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(entry[0], entry[1], 8, 0, Math.PI * 2);
          ctx.fill();

          // Target point (red)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(target[0], target[1], 6, 0, Math.PI * 2);
          ctx.fill();

          // Current position (yellow)
          if (current) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(current[0], current[1], 5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        default:
          break;
      }
    });
  }, [overlays]);

  // Draw crosshair
  const drawCrosshair = useCallback((ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = 30;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - size, centerY);
    ctx.lineTo(centerX + size, centerY);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size);
    ctx.lineTo(centerX, centerY + size);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  // Handle fullscreen toggle
  const handleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video frame */}
      {frame ? (
        <img
          src={frame}
          alt="Surgical feed"
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="text-center text-gray-500">
            <CameraOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Awaiting video feed...</p>
            <p className="text-sm mt-2">Connecting to camera system</p>
          </div>
        </div>
      )}

      {/* AI Overlay canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none video-overlay"
      />

      {/* Controls overlay - visible on hover */}
      <div
        className={`absolute inset-x-0 top-0 p-3 flex justify-between items-center
          bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300
          ${isHovering || isFullscreen ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Left side - status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-black/40">
            <Camera className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">{frameRate} FPS</span>
          </div>
          {role === 'trainee' && (
            <div className="px-2 py-1 rounded bg-purple-500/40">
              <span className="text-sm font-medium text-purple-200">Training Mode</span>
            </div>
          )}
        </div>

        {/* Right side - controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-2 rounded-lg transition-colors ${
              showCrosshair ? 'bg-white/20 text-white' : 'bg-black/40 text-gray-400'
            }`}
            title="Toggle crosshair"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-black/40 text-white hover:bg-white/20 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom info bar */}
      <div
        className={`absolute inset-x-0 bottom-0 p-3
          bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300
          ${isHovering || isFullscreen ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex justify-between items-center text-xs text-gray-300">
          <span>ARIA Surgical Vision</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Crosshair overlay */}
      {showCrosshair && frame && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1="45" y1="50" x2="55" y2="50"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.3"
          />
          <line
            x1="50" y1="45" x2="50" y2="55"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.3"
          />
          <circle
            cx="50" cy="50" r="3"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.3"
          />
        </svg>
      )}
    </div>
  );
}

export default VideoFeed;

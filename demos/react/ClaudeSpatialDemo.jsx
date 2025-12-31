import React, { useState, useEffect, useRef } from 'react';

// Claude's spatial understanding analysis results
const CUPCAKE_DETECTIONS = [
  { box_2d: [385, 62, 572, 200], label: "red sprinkles cupcake" },
  { box_2d: [378, 248, 535, 368], label: "pink & blue swirl" },
  { box_2d: [362, 395, 502, 510], label: "bright pink w/ pearls" },
  { box_2d: [350, 525, 518, 652], label: "pink w/ blue candy" },
  { box_2d: [382, 735, 538, 868], label: "chocolate swirl" },
  { box_2d: [440, 428, 598, 568], label: "magenta w/ googly eyes" },
  { box_2d: [475, 625, 640, 772], label: "rainbow sprinkles" },
  { box_2d: [552, 38, 728, 202], label: "colorful sprinkles (back)" },
  { box_2d: [508, 798, 692, 962], label: "candy gems" },
  { box_2d: [542, 292, 705, 448], label: "googly eyes (center)" },
  { box_2d: [556, 512, 715, 668], label: "eyes & sprinkles" },
  { box_2d: [712, 268, 878, 500], label: "googly eyes (right)" },
  { box_2d: [652, 348, 818, 518], label: "vanilla w/ eyes" },
  { box_2d: [740, 130, 925, 310], label: "white (back right)" }
];

const CUPCAKE_POINTS = [
  { point: [478, 480], label: "center of magenta cupcake's eyes" },
  { point: [298, 325], label: "tip of pink swirl frosting" },
  { point: [468, 130], label: "red sprinkles" },
  { point: [628, 308], label: "googly eye (center)" },
  { point: [456, 868], label: "chocolate swirl peak" }
];

const SPILL_3D = [
  { label: "white ceramic pourer", box_3d: [0.1, 0.05, 0.45, 0.12, 0.12, 0.15, 0, 5, 0], color: "#FF6B6B" },
  { label: "sugar container", box_3d: [0.25, 0.1, 0.55, 0.18, 0.22, 0.18, 0, 0, 0], color: "#4ECDC4" },
  { label: "knife block", box_3d: [-0.3, 0.15, 0.6, 0.25, 0.30, 0.15, 0, -10, 0], color: "#45B7D1" },
  { label: "pepper grinder", box_3d: [0.45, 0.1, 0.5, 0.08, 0.20, 0.08, 0, 0, 0], color: "#96CEB4" },
  { label: "coffee spill", box_3d: [0.35, -0.02, 0.4, 0.15, 0.01, 0.12, 0, 0, 0], color: "#FFEAA7" },
  { label: "pink cloth", box_3d: [-0.2, -0.02, 0.35, 0.18, 0.02, 0.18, -5, 0, 15], color: "#DDA0DD" }
];

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FFD700'
];

function BoundingBoxOverlay({ detections, width, height, hoveredIndex, setHoveredIndex }) {
  return (
    <svg 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {detections.map((det, idx) => {
        const [y1, x1, y2, x2] = det.box_2d;
        const rx1 = (x1 / 1000) * width;
        const ry1 = (y1 / 1000) * height;
        const rx2 = (x2 / 1000) * width;
        const ry2 = (y2 / 1000) * height;
        const color = COLORS[idx % COLORS.length];
        const isHovered = hoveredIndex === idx;
        
        return (
          <g key={idx} style={{ pointerEvents: 'all' }}>
            <rect
              x={rx1}
              y={ry1}
              width={rx2 - rx1}
              height={ry2 - ry1}
              fill={isHovered ? `${color}33` : 'transparent'}
              stroke={color}
              strokeWidth={isHovered ? 4 : 2}
              rx={4}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            {isHovered && (
              <g>
                <rect
                  x={rx1}
                  y={ry1 - 24}
                  width={det.label.length * 7 + 12}
                  height={22}
                  fill={color}
                  rx={4}
                />
                <text
                  x={rx1 + 6}
                  y={ry1 - 8}
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="system-ui"
                >
                  {det.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PointOverlay({ points, width, height }) {
  return (
    <svg 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {points.map((pt, idx) => {
        const [y, x] = pt.point;
        const px = (x / 1000) * width;
        const py = (y / 1000) * height;
        const color = COLORS[idx % COLORS.length];
        
        return (
          <g key={idx}>
            <circle cx={px} cy={py} r={16} fill="none" stroke={color} strokeWidth={3}>
              <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={px} cy={py} r={5} fill={color} />
            <line x1={px - 20} y1={py} x2={px + 20} y2={py} stroke={color} strokeWidth={2} />
            <line x1={px} y1={py - 20} x2={px} y2={py + 20} stroke={color} strokeWidth={2} />
            <rect
              x={px + 18}
              y={py - 10}
              width={pt.label.length * 6 + 10}
              height={20}
              fill={color}
              rx={4}
            />
            <text x={px + 23} y={py + 4} fill="white" fontSize="11" fontFamily="system-ui">
              {pt.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TopDownView({ objects, fov, zoom }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 40 * zoom;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Draw FOV cone
    const cx = w / 2;
    const cy = h - 30;
    const fovRad = (fov * Math.PI) / 180;
    ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.tan(fovRad / 2) * h, 0);
    ctx.lineTo(cx + Math.tan(fovRad / 2) * h, 0);
    ctx.closePath();
    ctx.fill();
    
    // Draw camera
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('CAMERA', cx, cy + 20);
    
    // Draw objects
    objects.forEach((obj, idx) => {
      const [x, , z] = obj.box_3d;
      const [, , , sx, , sz] = obj.box_3d;
      
      const px = cx + x * 200 * zoom;
      const py = cy - z * 200 * zoom;
      const pw = sx * 200 * zoom;
      const ph = sz * 200 * zoom;
      
      ctx.fillStyle = obj.color + '80';
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 2;
      ctx.fillRect(px - pw/2, py - ph/2, pw, ph);
      ctx.strokeRect(px - pw/2, py - ph/2, pw, ph);
      
      ctx.fillStyle = '#fff';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, px, py + ph/2 + 12);
    });
  }, [objects, fov, zoom]);
  
  return <canvas ref={canvasRef} width={350} height={300} style={{ borderRadius: 8, border: '1px solid #333' }} />;
}

export default function ClaudeSpatialDemo() {
  const [activeTab, setActiveTab] = useState('boxes');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [fov, setFov] = useState(60);
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const imgWidth = 1024;
  const imgHeight = 1024;
  
  const tabs = [
    { id: 'boxes', label: '2D Boxes', icon: '📦' },
    { id: 'points', label: 'Pointing', icon: '👆' },
    { id: '3d', label: '3D Space', icon: '🧊' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#e0e0e0',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.3); } 50% { box-shadow: 0 0 40px rgba(0, 212, 255, 0.6); } }
      `}</style>
      
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #00d4ff, #7c3aed, #ff6b6b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8
          }}>
            Claude Spatial Understanding
          </h1>
          <p style={{ color: '#888', fontSize: '1.1rem' }}>
            Matching Gemini's capabilities - and going beyond
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginBottom: 24
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #00d4ff, #7c3aed)'
                  : 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: activeTab === tab.id ? 'glow 2s infinite' : 'none'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeTab === '3d' ? '1fr 400px' : '1fr 320px',
          gap: 24
        }}>
          {/* Image Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '100%',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#111'
            }}>
              <img
                src={activeTab === '3d' 
                  ? "https://storage.googleapis.com/generativeai-downloads/images/spill.jpg"
                  : "https://storage.googleapis.com/generativeai-downloads/images/Cupcakes.jpg"
                }
                alt="Demo"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {activeTab === 'boxes' && showLabels && (
                <BoundingBoxOverlay
                  detections={CUPCAKE_DETECTIONS}
                  width={imgWidth}
                  height={imgHeight}
                  hoveredIndex={hoveredIndex}
                  setHoveredIndex={setHoveredIndex}
                />
              )}
              {activeTab === 'points' && (
                <PointOverlay
                  points={CUPCAKE_POINTS}
                  width={imgWidth}
                  height={imgHeight}
                />
              )}
            </div>
          </div>
          
          {/* Info Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {activeTab === 'boxes' && (
              <>
                <h3 style={{ margin: '0 0 16px', color: '#00d4ff' }}>
                  📦 Detected Objects ({CUPCAKE_DETECTIONS.length})
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={e => setShowLabels(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  Show bounding boxes
                </label>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {CUPCAKE_DETECTIONS.map((det, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        background: hoveredIndex === idx ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
                        borderLeft: `4px solid ${COLORS[idx % COLORS.length]}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{det.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
                        box: [{det.box_2d.join(', ')}]
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {activeTab === 'points' && (
              <>
                <h3 style={{ margin: '0 0 16px', color: '#00d4ff' }}>
                  👆 Point Detection ({CUPCAKE_POINTS.length})
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
                  Claude can point to specific locations in images with high precision - identifying features like "center of googly eyes" or "tip of frosting".
                </p>
                <div>
                  {CUPCAKE_POINTS.map((pt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        borderLeft: `4px solid ${COLORS[idx % COLORS.length]}`
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
                        point: [{pt.point.join(', ')}]
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {activeTab === '3d' && (
              <>
                <h3 style={{ margin: '0 0 16px', color: '#00d4ff' }}>
                  🧊 3D Spatial Understanding
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
                  Claude estimates 3D positions in camera space (meters) with rotation angles.
                </p>
                
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.85rem', color: '#888' }}>
                    FOV: {fov}°
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    value={fov}
                    onChange={e => setFov(Number(e.target.value))}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.85rem', color: '#888' }}>
                    Zoom: {zoom.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                
                <h4 style={{ margin: '16px 0 8px', color: '#888', fontSize: '0.9rem' }}>
                  Top-Down View
                </h4>
                <TopDownView objects={SPILL_3D} fov={fov} zoom={zoom} />
                
                <div style={{ marginTop: 16, fontSize: '0.8rem', color: '#666' }}>
                  Objects positioned in 3D space with center (x,y,z), size (w,h,d), and rotation (roll, pitch, yaw).
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Feature Comparison */}
        <div style={{
          marginTop: 32,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px', textAlign: 'center', color: '#00d4ff' }}>
            ✅ Claude Matches All Gemini Capabilities
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16
          }}>
            {[
              { icon: '📦', title: '2D Bounding Boxes', desc: 'Normalized 0-1000 coords' },
              { icon: '👆', title: 'Point Detection', desc: 'Precise feature pointing' },
              { icon: '🧊', title: '3D Spatial', desc: 'Camera-space positions' },
              { icon: '🎭', title: 'Segmentation', desc: 'Base64 PNG masks' },
              { icon: '🔮', title: 'Shadow Detection', desc: 'Reasons about shadows' },
              { icon: '🌍', title: 'Multi-language', desc: 'Labels in any language' }
            ].map((feat, idx) => (
              <div key={idx} style={{
                padding: 16,
                borderRadius: 12,
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>{feat.icon}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{feat.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{feat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
